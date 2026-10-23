import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { filterActivityByPeriod, getActivityHistory, type StellarActivity } from '../src/services/stellar/activity';
import { MOVYA_TREASURY } from '../src/services/stellar/swaps';
import { USDC_ISSUER } from '../src/services/stellar/payments';

const originalFetch = globalThis.fetch;
const originalNetwork = process.env.EXPO_PUBLIC_STELLAR_NETWORK;
const originalHorizon = process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL;
const wallet = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(11)).publicKey();
const other = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(12)).publicKey();

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalNetwork === undefined) delete process.env.EXPO_PUBLIC_STELLAR_NETWORK; else process.env.EXPO_PUBLIC_STELLAR_NETWORK = originalNetwork;
  if (originalHorizon === undefined) delete process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL; else process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL = originalHorizon;
});

test('activity groups a swap and its Movya fee into one row while preserving normal transfers', async () => {
  process.env.EXPO_PUBLIC_STELLAR_NETWORK = 'testnet';
  process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';
  const records = [
    { id: 'swap', transaction_hash: 'a'.repeat(64), from: wallet, to: wallet, amount: '44.0277060', asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC_ISSUER, created_at: '2026-10-19T02:44:47Z', type: 'path_payment_strict_send', transaction_successful: true, source_amount: '49.7500000', source_asset_type: 'native' },
    { id: 'fee', transaction_hash: 'a'.repeat(64), from: wallet, to: MOVYA_TREASURY, amount: '0.2500000', asset_type: 'native', created_at: '2026-10-19T02:44:47Z', type: 'payment', transaction_successful: true },
    { id: 'payment', transaction_hash: 'b'.repeat(64), from: wallet, to: other, amount: '1.0000000', asset_type: 'native', created_at: '2026-10-18T20:00:00Z', type: 'payment', transaction_successful: true },
  ];
  globalThis.fetch = async url => {
    assert.match(String(url), new RegExp(`/accounts/${wallet}/payments\\?order=desc&limit=40$`));
    return Response.json({ _embedded: { records } });
  };
  const activity = await getActivityHistory(wallet);
  assert.equal(activity.length, 2);
  assert.deepEqual(activity[0], { kind: 'swap', id: 'swap', transactionHash: 'a'.repeat(64), createdAt: '2026-10-19T02:44:47Z', fromAsset: 'XLM', toAsset: 'USDC', sourceAmount: '50.0000000', destinationAmount: '44.0277060' });
  assert.equal(activity[1].kind, 'transfer');
  if (activity[1].kind === 'transfer') assert.equal(activity[1].payment.id, 'payment');
});

test('activity ignores unsupported path payments and does not hide unrelated payments', async () => {
  process.env.EXPO_PUBLIC_STELLAR_NETWORK = 'testnet';
  process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org';
  const records = [
    { id: 'fake-swap', transaction_hash: 'c'.repeat(64), from: wallet, to: wallet, amount: '20.0000000', asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: other, created_at: '2026-10-19T03:00:00Z', type: 'path_payment_strict_send', transaction_successful: true, source_amount: '10.0000000', source_asset_type: 'native' },
    { id: 'ordinary', transaction_hash: 'd'.repeat(64), from: wallet, to: MOVYA_TREASURY, amount: '1.0000000', asset_type: 'native', created_at: '2026-10-19T02:00:00Z', type: 'payment', transaction_successful: true },
  ];
  globalThis.fetch = async () => Response.json({ _embedded: { records } });
  const activity = await getActivityHistory(wallet);
  assert.equal(activity.length, 1);
  assert.equal(activity[0].kind, 'transfer');
});

test('activity periods filter today, the last week and the last month', () => {
  const makePayment = (id: string, created_at: string): StellarActivity => ({
    kind: 'transfer',
    payment: { id, transaction_hash: id.repeat(64).slice(0, 64), from: wallet, to: other, amount: '1.0000000', asset_type: 'native', created_at, type: 'payment', transaction_successful: true },
  });
  const activities = [
    makePayment('a', '2026-10-23T09:00:00Z'),
    makePayment('b', '2026-10-20T09:00:00Z'),
    makePayment('c', '2026-10-01T09:00:00Z'),
    makePayment('d', '2026-08-01T09:00:00Z'),
  ];
  const now = new Date('2026-10-23T12:00:00Z').getTime();
  assert.deepEqual(filterActivityByPeriod(activities, 'today', now).map(item => item.kind === 'transfer' && item.payment.id), ['a']);
  assert.deepEqual(filterActivityByPeriod(activities, '7d', now).map(item => item.kind === 'transfer' && item.payment.id), ['a', 'b']);
  assert.deepEqual(filterActivityByPeriod(activities, '30d', now).map(item => item.kind === 'transfer' && item.payment.id), ['a', 'b', 'c']);
  assert.equal(filterActivityByPeriod(activities, 'all', now), activities);
});
