import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { assertTestnet, checkSubmission, enableUSDC, normalizeAmount, preparePayment, SubmissionUnknownError, submitPayment, transactionHash, USDC_ISSUER, validateAddress, type Balance, type TestnetAccount } from '../src/services/stellar/payments';

const sender = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(1));
const receiver = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(2));
const wrongIssuer = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(3)).publicKey();
const native = (balance = '100'): Balance => ({ asset_type: 'native', balance });
const usdc = (balance = '25', patch: Partial<Balance> = {}): Balance => ({ asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC_ISSUER, balance, limit: '922337203685.4775807', is_authorized: true, ...patch });
const account = (key: string, balances: Balance[]): TestnetAccount => ({ account_id: key, sequence: '123', balances, subentry_count: balances.length - 1 });
let from: TestnetAccount, to: TestnetAccount, posts: string[], mode: 'success' | 'timeout' | 'bad-seq', requests: number;
const originalFetch = globalThis.fetch;
const originalNetwork = process.env.EXPO_PUBLIC_STELLAR_NETWORK;
const originalHorizon = process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL;
function setup() {
  from = account(sender.publicKey(), [native(), usdc()]);
  to = account(receiver.publicKey(), [native(), usdc('0')]);
  posts = []; mode = 'success'; requests = 0;
  globalThis.fetch = async (url, options) => {
    requests++;
    const path = String(url);
    if (options?.method === 'POST') {
      posts.push(String(options.body));
      if (mode === 'timeout') throw new TypeError('network unavailable');
      if (mode === 'bad-seq') return Response.json({ extras: { result_codes: { transaction: 'tx_bad_seq' } } }, { status: 400 });
      const tx = new Transaction(new URLSearchParams(String(options.body)).get('tx')!, Networks.TESTNET);
      return Response.json({ hash: transactionHash(tx), successful: true });
    }
    if (path.endsWith(`/accounts/${sender.publicKey()}`)) return Response.json(from);
    if (path.endsWith(`/accounts/${receiver.publicKey()}`)) return Response.json(to);
    if (path.endsWith('/fee_stats')) return Response.json({ fee_charged: { p95: '200' }, last_ledger_base_fee: '100' });
    if (path.includes('/ledgers?')) return Response.json({ _embedded: { records: [{ base_reserve_in_stroops: 5000000 }] } });
    if (path.includes('/transactions/')) return Response.json({}, { status: 404 });
    throw new Error(`Unexpected request: ${path}`);
  };
}
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalNetwork === undefined) delete process.env.EXPO_PUBLIC_STELLAR_NETWORK; else process.env.EXPO_PUBLIC_STELLAR_NETWORK = originalNetwork;
  if (originalHorizon === undefined) delete process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL; else process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL = originalHorizon;
});
const prepare = (amount = '1', asset: 'USDC' | 'XLM' = 'USDC') => preparePayment({ source: sender.publicKey(), destination: receiver.publicKey(), amount, asset });
const sign = async (xdr: string) => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(sender); return tx.toXDR(); };

test('amounts preserve seven decimal precision and normalize comma decimals', () => {
  assert.equal(normalizeAmount('0001,0000001'), '1.0000001');
  assert.equal(normalizeAmount('922337203685.4775807'), '922337203685.4775807');
  for (const value of ['0', '-1', 'NaN', '1e3', '1.00000001', '1,2,3', '922337203685.4775808']) assert.throws(() => normalizeAmount(value));
});
test('addresses require a valid Stellar checksum', () => {
  validateAddress(sender.publicKey());
  assert.throws(() => validateAddress('GDK3EXTERNALADDRESSP9Q'));
  assert.throws(() => validateAddress(sender.publicKey().slice(0, -1) + 'Z'));
});
test('mainnet configuration is rejected before network access', async () => {
  setup(); process.env.EXPO_PUBLIC_STELLAR_NETWORK = 'mainnet';
  assert.throws(assertTestnet); await assert.rejects(prepare()); assert.equal(requests, 0);
});
test('a custom/mainnet Horizon endpoint cannot be used for signing', async () => {
  setup(); process.env.EXPO_PUBLIC_STELLAR_HORIZON_URL = 'https://horizon.stellar.org';
  await assert.rejects(prepare()); assert.equal(requests, 0);
});
test('USDC review uses the verified issuer and the current fee', async () => {
  setup(); const review = await prepare('20'); const tx = new Transaction(review.xdr, Networks.TESTNET);
  assert.equal(review.issuer, USDC_ISSUER); assert.equal(review.fee, '0.0000200');
  assert.equal(tx.operations.length, 1); assert.equal(tx.signatures.length, 0); assert.equal(posts.length, 0);
});
test('same asset code with a different issuer does not count as USDC', async () => {
  setup(); from.balances[1].asset_issuer = wrongIssuer;
  await assert.rejects(prepare(), /habilitar USDC/);
});
test('missing recipient trustline is rejected', async () => {
  setup(); to.balances = [native()]; await assert.rejects(prepare(), /habilitar USDC/);
});
test('unauthorized recipient trustline is rejected', async () => {
  setup(); to.balances[1].is_authorized = false; await assert.rejects(prepare(), /autorizada/);
});
test('sender selling liabilities reduce the spendable balance', async () => {
  setup(); from.balances[1].selling_liabilities = '24.5'; await assert.rejects(prepare(), /suficiente USDC/);
});
test('recipient buying liabilities count against the trustline limit', async () => {
  setup(); to.balances[1] = usdc('9', { limit: '10', buying_liabilities: '0.5' });
  await assert.rejects(prepare(), /capacidad/);
});
test('XLM sends preserve the account reserve and network fee', async () => {
  setup(); await assert.rejects(prepare('99', 'XLM'), /reserva/);
  const review = await prepare('98', 'XLM'); assert.equal(review.issuer, undefined);
});
test('insufficient XLM prevents even a USDC send', async () => {
  setup(); from.balances[0] = native('1.5'); await assert.rejects(prepare(), /XLM/);
});
test('self transfers are rejected', async () => {
  setup(); await assert.rejects(preparePayment({ source: sender.publicKey(), destination: sender.publicKey(), amount: '1', asset: 'XLM' }), /diferente/);
});
test('success is returned only after Horizon confirms the exact transaction', async () => {
  setup(); const review = await prepare(); const receipt = await submitPayment(review, sign);
  assert.equal(receipt.hash, review.hash); assert.ok(receipt.explorerUrl.endsWith(review.hash)); assert.equal(posts.length, 1);
});
test('modified confirmation details cannot be signed', async () => {
  setup(); const review = await prepare(); let signed = false;
  await assert.rejects(submitPayment({ ...review, amount: '2.0000000' }, async () => { signed = true; return ''; }), /cambiaron/);
  assert.equal(signed, false); assert.equal(posts.length, 0);
});
test('expired reviews cannot be submitted', async () => {
  setup(); const review = await prepare(); await assert.rejects(submitPayment({ ...review, expiresAt: 1 }, sign)); assert.equal(posts.length, 0);
});
test('a different key cannot sign the reviewed transfer', async () => {
  setup(); const review = await prepare();
  await assert.rejects(submitPayment(review, async (xdr) => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(receiver); return tx.toXDR(); }), /firma/);
  assert.equal(posts.length, 0);
});
test('network uncertainty exposes the hash and never automatically submits again', async () => {
  setup(); const review = await prepare(); mode = 'timeout';
  await assert.rejects(submitPayment(review, sign), (error) => error instanceof SubmissionUnknownError && error.hash === review.hash);
  assert.equal(posts.length, 1); assert.equal(await checkSubmission(review.hash), null); assert.equal(posts.length, 1);
});
test('sequence failure requires a fresh review', async () => {
  setup(); const review = await prepare(); mode = 'bad-seq';
  await assert.rejects(submitPayment(review, sign), /cuenta cambió/);
});
test('enabling an existing USDC trustline does not sign or submit', async () => {
  setup(); await enableUSDC(sender.publicKey(), async () => { throw new Error('Should not sign'); }); assert.equal(posts.length, 0);
});
