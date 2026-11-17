import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { classifyTransaction, type TransactionLike } from '../src/services/stellar/signingPolicy';

const ME = 'G' + 'A'.repeat(55), FRIEND = 'G' + 'B'.repeat(55), TREASURY = 'G' + 'T'.repeat(55), RECOVERY = 'G' + 'R'.repeat(55), ISSUER = 'G' + 'I'.repeat(55);
const XLM = { code: 'XLM' }, USDC = { code: 'USDC', issuer: ISSUER }, FAKE = { code: 'USDC', issuer: 'G' + 'Z'.repeat(55) };
const now = 1_000_000;
const policy = { account: ME, usdcIssuer: ISSUER, treasury: TREASURY, now };
const tx = (operations: TransactionLike['operations'], extra: Partial<TransactionLike> = {}): TransactionLike =>
  ({ source: ME, fee: '200', signatures: [], memo: { type: 'none' }, timeBounds: { minTime: '0', maxTime: String(now + 180) }, operations, ...extra });

test('allows exactly the transaction shapes Movya offers', () => {
  assert.equal(classifyTransaction(tx([{ type: 'payment', destination: FRIEND, asset: USDC, amount: '1' }]), policy), 'payment');
  assert.equal(classifyTransaction(tx([
    { type: 'payment', destination: TREASURY, asset: XLM, amount: '0.25' },
    { type: 'pathPaymentStrictSend', destination: ME, sendAsset: XLM, destAsset: USDC, sendAmount: '49.75', destMin: '1', path: [] },
  ]), policy), 'swap');
  assert.equal(classifyTransaction(tx([{ type: 'changeTrust', line: USDC, limit: '922337203685.4775807' }]), policy), 'trustline');
});

test('refuses dangerous operations even when they come from the wallet itself', () => {
  for (const op of [
    { type: 'accountMerge', destination: FRIEND },
    { type: 'setOptions', signer: { ed25519PublicKey: FRIEND, weight: 255 } },
    { type: 'manageData', name: 'x', value: 'y' },
    { type: 'changeTrust', line: USDC, limit: '0' },
    { type: 'changeTrust', line: FAKE },
    { type: 'payment', destination: FRIEND, asset: FAKE, amount: '1' },
    { type: 'payment', destination: ME, asset: XLM, amount: '1' },
  ]) assert.throws(() => classifyTransaction(tx([op]), policy), /no firmará/, op.type);
});

test('refuses swaps that send the fee or the output anywhere else', () => {
  const swap = (fee: string, output: string) => tx([
    { type: 'payment', destination: fee, asset: XLM, amount: '0.25' },
    { type: 'pathPaymentStrictSend', destination: output, sendAsset: XLM, destAsset: USDC, sendAmount: '1', destMin: '1', path: [] },
  ]);
  assert.throws(() => classifyTransaction(swap(FRIEND, ME), policy), /wallet de Movya/);
  assert.throws(() => classifyTransaction(swap(TREASURY, FRIEND), policy), /regresa/);
});

test('refuses long-lived, expensive, memo-carrying, pre-signed or foreign-source transactions', () => {
  const pay = [{ type: 'payment', destination: FRIEND, asset: XLM, amount: '1' }];
  assert.throws(() => classifyTransaction(tx(pay, { timeBounds: undefined }), policy), /expiración/);
  assert.throws(() => classifyTransaction(tx(pay, { timeBounds: { minTime: '0', maxTime: '0' } }), policy), /expiración/);
  assert.throws(() => classifyTransaction(tx(pay, { timeBounds: { minTime: '0', maxTime: String(now + 3600) } }), policy), /expiración/);
  assert.throws(() => classifyTransaction(tx(pay, { fee: '50000000' }), policy), /comisión/);
  assert.throws(() => classifyTransaction(tx(pay, { memo: { type: 'text' } }), policy), /memo/);
  assert.throws(() => classifyTransaction(tx(pay, { signatures: [{}] }), policy), /firmas/);
  assert.throws(() => classifyTransaction(tx(pay, { source: FRIEND }), policy), /origen/);
  assert.throws(() => classifyTransaction(tx([{ ...pay[0], source: FRIEND }]), policy), /otra cuenta/);
  assert.throws(() => classifyTransaction(tx([...pay, ...pay]), policy), /no ofrece/);
});

test('recovery setup is accepted only for the exact signer and thresholds the person created', () => {
  const setup = (overrides: Record<string, unknown> = {}) => tx([{ type: 'setOptions', signer: { ed25519PublicKey: RECOVERY, weight: 2 }, masterWeight: 1, lowThreshold: 1, medThreshold: 1, highThreshold: 2, ...overrides }]);
  assert.throws(() => classifyTransaction(setup(), policy), /firmantes/);
  const withRecovery = { ...policy, recoverySigner: RECOVERY };
  assert.equal(classifyTransaction(setup(), withRecovery), 'recovery-setup');
  assert.throws(() => classifyTransaction(setup({ signer: { ed25519PublicKey: FRIEND, weight: 2 } }), withRecovery), /recuperación/);
  assert.throws(() => classifyTransaction(setup({ highThreshold: 1 }), withRecovery), /umbrales/);
  assert.throws(() => classifyTransaction(setup({ masterWeight: 2 }), withRecovery), /umbrales/);
  assert.throws(() => classifyTransaction(setup({ homeDomain: 'evil.example' }), withRecovery), /no permitidas/);
});

test('emergency transfer: everything must go to the new wallet created on this device', () => {
  const NEW = 'G' + 'N'.repeat(55);
  const sweep = { ...policy, sweepTo: NEW };
  const ops = [
    { type: 'createAccount', destination: NEW, startingBalance: '3' },
    { type: 'changeTrust', line: USDC, source: NEW },
    { type: 'payment', destination: NEW, asset: USDC, amount: '10' },
    { type: 'changeTrust', line: USDC, limit: '0' },
    { type: 'accountMerge', destination: NEW },
  ];
  assert.equal(classifyTransaction(tx(ops), sweep), 'sweep');
  assert.throws(() => classifyTransaction(tx(ops), policy), /no ofrece|otra cuenta/);
  assert.throws(() => classifyTransaction(tx([...ops.slice(0, 4), { type: 'accountMerge', destination: FRIEND }]), sweep), /no permitida/);
  assert.throws(() => classifyTransaction(tx([{ type: 'payment', destination: NEW, asset: XLM, amount: '1' }]), sweep), /no crea/);
  assert.throws(() => classifyTransaction(tx([ops[0], { type: 'setOptions', signer: { ed25519PublicKey: FRIEND, weight: 1 } }]), sweep), /no permitida/);
  assert.throws(() => classifyTransaction(tx([ops[0], { type: 'changeTrust', line: USDC, source: FRIEND }]), sweep), /no permitida/);
});
