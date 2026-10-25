import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { runAutomaticWelcomeFunding } from '../src/services/stellar/welcomeFunding';
import { USDC_ISSUER, type TestnetAccount } from '../src/services/stellar/payments';
import type { WelcomeFundingAsset, WelcomeFundingResult } from '../src/services/backend/testnetWelcomeFunding';

const wallet = Keypair.random().publicKey();
const account = (withUsdc = false): TestnetAccount => ({
  account_id: wallet, sequence: '1', subentry_count: withUsdc ? 1 : 0,
  balances: [
    { asset_type: 'native', balance: '5.0000000' },
    ...(withUsdc ? [{ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC_ISSUER, balance: '0.0000000', is_authorized: true }] : []),
  ],
});
const funded = (asset: WelcomeFundingAsset): WelcomeFundingResult => ({ status: 'funded', asset, hash: asset === 'XLM' ? 'a'.repeat(64) : 'b'.repeat(64) });

test('automatic welcome flow funds XLM, signs the local trustline, then funds USDC', async () => {
  const events: string[] = [];
  const result = await runAutomaticWelcomeFunding({
    publicKey: wallet, signerPublicKey: wallet,
    signTrustline: async () => { events.push('sign'); return 'signed'; },
    refresh: async () => { events.push('refresh'); },
  }, {
    request: async asset => { events.push(`request:${asset}`); return funded(asset); },
    readAccount: async () => { events.push('read'); return account(false); },
    enableTrustline: async (_key, sign) => { events.push('trustline'); await sign('xdr'); },
    wait: async () => undefined,
  });
  assert.equal(result, 'funded');
  assert.deepEqual(events, ['request:XLM', 'read', 'trustline', 'sign', 'request:USDC', 'refresh']);
});

test('an existing trustline is reused and an ineligible old wallet stops silently', async () => {
  let enabled = false;
  await runAutomaticWelcomeFunding({ publicKey: wallet, signerPublicKey: wallet, signTrustline: async xdr => xdr, refresh: async () => undefined }, {
    request: async asset => funded(asset), readAccount: async () => account(true),
    enableTrustline: async () => { enabled = true; }, wait: async () => undefined,
  });
  assert.equal(enabled, false);

  let read = false;
  const result = await runAutomaticWelcomeFunding({ publicKey: wallet, signerPublicKey: wallet, signTrustline: async xdr => xdr, refresh: async () => undefined }, {
    request: async asset => ({ status: 'not_eligible', asset }),
    readAccount: async () => { read = true; return account(); }, wait: async () => undefined,
  });
  assert.equal(result, 'not_eligible');
  assert.equal(read, false);
});

test('a busy funding lease is retried without reordering the two assets', async () => {
  const calls: WelcomeFundingAsset[] = [];
  let first = true;
  await runAutomaticWelcomeFunding({ publicKey: wallet, signerPublicKey: wallet, signTrustline: async xdr => xdr, refresh: async () => undefined }, {
    request: async asset => { calls.push(asset); if (asset === 'XLM' && first) { first = false; return { status: 'processing', asset }; } return funded(asset); },
    readAccount: async () => account(true), wait: async () => undefined,
  });
  assert.deepEqual(calls, ['XLM', 'XLM', 'USDC']);
});
