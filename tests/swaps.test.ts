import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk/base';
import { MOVYA_SWAP_FEE_BPS, MOVYA_TREASURY, prepareSwap, splitSwapAmount, submitSwap, validateSwapReview, swapSpendable, swapMinimum } from '../src/services/stellar/swaps';
import { SubmissionUnknownError, transactionHash, USDC_ISSUER, type TestnetAccount } from '../src/services/stellar/payments';
import { parseSwapRequest } from '../src/services/chatIntent';
import { createSwapFlow } from '../src/services/swapFlow';

const key = Keypair.fromRawEd25519Seed(new Uint8Array(32).fill(7));
const originalFetch = globalThis.fetch;
const originalNetwork = process.env.EXPO_PUBLIC_STELLAR_NETWORK;
let account: TestnetAccount;
let treasury: TestnetAccount;
let paths: any[];
let posts: Transaction[];
let mode: 'success' | 'timeout' | 'price' = 'success';
let queries: URL[];
let feeP95: string;
function setup() {
  account = { account_id: key.publicKey(), sequence: '123', subentry_count: 1, balances: [
    { asset_type: 'native', balance: '100', selling_liabilities: '2' },
    { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC_ISSUER, balance: '50', selling_liabilities: '5', buying_liabilities: '1', limit: '100', is_authorized: true },
  ] };
  treasury = { account_id: MOVYA_TREASURY, sequence: '456', subentry_count: 1, balances: [
    { asset_type: 'native', balance: '10030', selling_liabilities: '0' },
    { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC_ISSUER, balance: '0', selling_liabilities: '0', buying_liabilities: '0', limit: '922337203685.4775807', is_authorized: true },
  ] };
  paths = [{ source_asset_type: 'native', source_amount: '49.7500000', destination_asset_type: 'credit_alphanum4', destination_asset_code: 'USDC', destination_asset_issuer: USDC_ISSUER, destination_amount: '10.1234567', path: [] }];
  posts = []; queries = []; mode = 'success'; feeP95 = '200';
  globalThis.fetch = async (url, options) => {
    const target = new URL(String(url)); queries.push(target);
    if (options?.method === 'POST') {
      const tx = new Transaction(new URLSearchParams(String(options.body)).get('tx')!, Networks.TESTNET); posts.push(tx);
      if (mode === 'timeout') throw new Error('offline');
      if (mode === 'price') return Response.json({ extras: { result_codes: { transaction: 'tx_failed', operations: ['op_under_destmin'] } } }, { status: 400 });
      return Response.json({ hash: transactionHash(tx), successful: true });
    }
    if (target.pathname === `/accounts/${MOVYA_TREASURY}`) return Response.json(treasury);
    if (target.pathname.startsWith('/accounts/')) return Response.json(account);
    if (target.pathname === '/fee_stats') return Response.json({ fee_charged: { p95: feeP95 }, last_ledger_base_fee: '100' });
    if (target.pathname === '/ledgers') return Response.json({ _embedded: { records: [{ base_reserve_in_stroops: 5000000 }] } });
    if (target.pathname === '/paths/strict-send') return Response.json({ _embedded: { records: paths } });
    if (/^\/transactions\/[a-f0-9]{64}\/operations$/.test(target.pathname)) {
      const path = paths[0]; const hash = target.pathname.split('/')[2];
      return Response.json({ _embedded: { records: [{ type: 'path_payment_strict_send', transaction_hash: hash, from: key.publicKey(), to: key.publicKey(), amount: path.destination_amount,
        asset_type: path.destination_asset_type, asset_code: path.destination_asset_code, asset_issuer: path.destination_asset_issuer,
        source_amount: path.source_amount, source_asset_type: path.source_asset_type, source_asset_code: path.source_asset_code, source_asset_issuer: path.source_asset_issuer }] } });
    }
    throw new Error('unexpected request');
  };
}
afterEach(() => { globalThis.fetch = originalFetch; if (originalNetwork === undefined) delete process.env.EXPO_PUBLIC_STELLAR_NETWORK; else process.env.EXPO_PUBLIC_STELLAR_NETWORK = originalNetwork; });
const prepare = () => prepareSwap({ source: key.publicKey(), amount: '50', from: 'XLM', to: 'USDC' });
const sign = async (xdr: string) => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(key); return tx.toXDR(); };

test('Cambia 50 XLM a USDC and English commands preserve seven decimals and assets', () => {
  assert.deepEqual(parseSwapRequest('Cambia 50 XLM a USDC'), { amount: '50', from: 'XLM', to: 'USDC' });
  assert.deepEqual(parseSwapRequest('Swap 1,0000001 usdc for xlm'), { amount: '1.0000001', from: 'USDC', to: 'XLM' });
  assert.deepEqual(parseSwapRequest('Change 50 XLM to USDC'), parseSwapRequest('Cambiar 50 XLM por USDC'));
  assert.equal(parseSwapRequest('Cambia XLM a USDC'), null);
});
test('quote includes an atomic 0.5% Movya payment and swaps the remaining 99.5%', async () => {
  setup(); const before = Math.floor(Date.now() / 1000); const quote = await prepare();
  const tx = validateSwapReview(quote); const [feeOp, swapOp] = tx.operations;
  assert.equal(feeOp.type, 'payment'); assert.equal(swapOp.type, 'pathPaymentStrictSend');
  if (feeOp.type !== 'payment' || swapOp.type !== 'pathPaymentStrictSend') throw new Error('wrong operations');
  assert.equal(feeOp.destination, MOVYA_TREASURY); assert.equal(feeOp.amount, '0.2500000'); assert.ok(feeOp.asset.isNative());
  assert.equal(swapOp.destination, key.publicKey()); assert.equal(swapOp.sendAmount, '49.7500000');
  assert.equal(swapOp.destAsset.issuer, USDC_ISSUER); assert.equal(swapOp.destMin, '10.0728394');
  assert.equal(quote.amount, '50.0000000'); assert.equal(quote.swapAmount, '49.7500000'); assert.equal(quote.appFee, '0.2500000');
  assert.equal(quote.appFeeBps, MOVYA_SWAP_FEE_BPS); assert.equal(quote.treasury, MOVYA_TREASURY);
  assert.equal(quote.fee, '0.0000400'); assert.ok(quote.expiresAt >= before + 60 && quote.expiresAt <= before + 61);
  const query = queries.find(u => u.pathname === '/paths/strict-send')!;
  assert.equal(query.searchParams.get('destination_assets'), `USDC:${USDC_ISSUER}`);
  assert.equal(query.searchParams.get('source_amount'), '49.7500000'); assert.equal(posts.length, 0);
});
test('MAX preserves reserves, sponsorship, current fee and selling liabilities without floating-point arithmetic', () => {
  setup(); assert.deepEqual(swapSpendable(account, 400n, 15_000_000n), { XLM: '96.4999600', USDC: '45.0000000' });
  account.balances[0].balance = '3.0000000';
  assert.deepEqual(swapSpendable(account, 400n, 15_000_000n), { XLM: '0.0000000', USDC: '0.0000000' });
  assert.equal(swapMinimum('1.0000001'), '0.9950000');
  assert.deepEqual(splitSwapAmount('1.0000001'), { appFee: '0.0050000', swapAmount: '0.9950001' });
  assert.throws(() => splitSwapAmount('0.0000199'), /demasiado pequeño/);
});
test('best valid route wins; impostor USDC and mismatched amounts are ignored', async () => {
  setup(); const base = paths[0];
  paths = [{ ...base, destination_amount: '9' }, { ...base, destination_amount: '11' }, { ...base, destination_amount: '999', destination_asset_issuer: Keypair.random().publicKey() }, { ...base, source_amount: '1', destination_amount: '999' }];
  assert.equal((await prepare()).estimated, '11.0000000');
});
test('no liquidity is reported explicitly and never returns a fabricated quote', async () => {
  setup(); paths = []; await assert.rejects(prepare(), /liquidez/); assert.equal(posts.length, 0);
});
test('an extreme Testnet fee statistic is capped at the signing ceiling', async () => {
  setup(); feeP95 = '500001';
  const quote = await prepare();
  assert.equal(quote.fee, '0.1000000');
  assert.equal(queries.some(query => query.pathname === '/paths/strict-send'), true);
  assert.doesNotThrow(() => validateSwapReview(quote));
});
test('missing or unauthorized USDC, insufficient balance/reserve and receiving capacity reject quotes', async () => {
  setup(); account.balances.pop(); await assert.rejects(prepare(), /Habilita USDC/);
  setup(); account.balances[1].is_authorized = false; await assert.rejects(prepare(), /autorizada/);
  setup(); account.balances[0].balance = '1'; await assert.rejects(prepare(), /reserva/);
  setup(); await assert.rejects(prepareSwap({ source: key.publicKey(), amount: '99', from: 'XLM', to: 'USDC' }), /saldo disponible/);
  setup(); account.balances[1].limit = '60'; await assert.rejects(prepare(), /capacidad/);
});
test('USDC to XLM uses verified source issuer and authorized spendable balance', async () => {
  setup(); paths = [{ source_asset_type: 'credit_alphanum4', source_asset_code: 'USDC', source_asset_issuer: USDC_ISSUER, source_amount: '0.9950000', destination_asset_type: 'native', destination_amount: '5', path: [] }];
  const quote = await prepareSwap({ source: key.publicKey(), amount: '1', from: 'USDC', to: 'XLM' });
  assert.equal(quote.estimated, '5.0000000'); assert.equal(quote.appFee, '0.0050000'); assert.equal(quote.swapAmount, '0.9950000');
  const tx = validateSwapReview(quote); const feeOp = tx.operations[0];
  assert.equal(feeOp.type, 'payment');
  if (feeOp.type !== 'payment') throw new Error('wrong fee operation');
  assert.equal(feeOp.destination, MOVYA_TREASURY); assert.equal(feeOp.amount, '0.0050000'); assert.equal(feeOp.asset.code, 'USDC'); assert.equal(feeOp.asset.issuer, USDC_ISSUER);
  const query = queries.find(u => u.pathname === '/paths/strict-send')!;
  assert.equal(query.searchParams.get('source_asset_issuer'), USDC_ISSUER); assert.equal(query.searchParams.get('source_amount'), '0.9950000');
  await assert.rejects(prepareSwap({ source: key.publicKey(), amount: '46', from: 'USDC', to: 'XLM' }), /saldo disponible/);
});
test('USDC-source swaps require the exact authorized treasury trustline and receiving capacity', async () => {
  setup(); paths = [{ source_asset_type: 'credit_alphanum4', source_asset_code: 'USDC', source_asset_issuer: USDC_ISSUER, source_amount: '0.9950000', destination_asset_type: 'native', destination_amount: '5', path: [] }];
  treasury.balances.pop(); await assert.rejects(prepareSwap({ source: key.publicKey(), amount: '1', from: 'USDC', to: 'XLM' }), /USDC correcto/);
  setup(); treasury.balances[1].is_authorized = false; await assert.rejects(prepareSwap({ source: key.publicKey(), amount: '1', from: 'USDC', to: 'XLM' }), /USDC correcto/);
  setup(); treasury.balances[1].limit = '0.001'; await assert.rejects(prepareSwap({ source: key.publicKey(), amount: '1', from: 'USDC', to: 'XLM' }), /capacidad/);
});
test('changed source, amounts, assets, fees, treasury, path, estimates and expired quotes cannot be signed', async () => {
  setup(); const quote = await prepare(); let signatures = 0;
  for (const patch of [{ source: Keypair.random().publicKey() }, { amount: '1.0000000' }, { swapAmount: '49.0000000' }, { appFee: '1.0000000' }, { appFeeBps: 100 }, { treasury: Keypair.random().publicKey() }, { from: 'USDC' as const, to: 'XLM' as const }, { fee: '1.0000000' }, { minimum: '0.0000001' }, { path: ['native'] }, { estimated: '20.0000000' }, { slippageBps: 100 }, { expiresAt: 1 }]) {
    await assert.rejects(submitSwap({ ...quote, ...patch }, async xdr => { signatures++; return sign(xdr); }));
  }
  const originalNow = Date.now;
  try { Date.now = () => quote.expiresAt * 1000; await assert.rejects(submitSwap(quote, sign), /expiró/); } finally { Date.now = originalNow; }
  assert.equal(signatures, 0); assert.equal(posts.length, 0);
});
test('only the reviewed signed hash succeeds; wrong signatures and worse-than-minimum prices fail', async () => {
  setup(); const quote = await prepare();
  const wrong = Keypair.random();
  await assert.rejects(submitSwap(quote, async xdr => { const tx = new Transaction(xdr, Networks.TESTNET); tx.sign(wrong); return tx.toXDR(); }), /firma/);
  const receipt = await submitSwap(quote, sign); assert.equal(receipt.hash, quote.hash); assert.equal(receipt.receivedAmount, '10.1234567'); assert.equal(posts.length, 1);
  mode = 'price'; await assert.rejects(submitSwap(quote, sign), /op_under_destmin/);
});
test('mainnet and unknown assets never quote or sign; timeouts expose the reviewed hash', async () => {
  setup(); process.env.EXPO_PUBLIC_STELLAR_NETWORK = 'mainnet'; await assert.rejects(prepare()); assert.equal(queries.length, 0);
  process.env.EXPO_PUBLIC_STELLAR_NETWORK = 'testnet';
  await assert.rejects(prepareSwap({ source: key.publicKey(), amount: '1', from: 'EURC' as any, to: 'USDC' }));
  const quote = await prepare(); mode = 'timeout'; await assert.rejects(submitSwap(quote, sign), error => error instanceof SubmissionUnknownError && error.hash === quote.hash);
});
test('stale quote responses never overwrite newer edits or cleared input', async () => {
  setup(); const quote = await prepare();
  let resolveFirst!: (value: typeof quote) => void;
  const flow = createSwapFlow({ source: () => key.publicKey(), prepare: input => input.amount === '1' ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve({ ...quote, amount: input.amount }), submit: async () => ({ hash: quote.hash, explorerUrl: '' }), check: async () => null, refresh: async () => {} });
  const first = flow.start({ source: key.publicKey(), amount: '1', from: 'XLM', to: 'USDC' });
  await flow.start({ source: key.publicKey(), amount: '2', from: 'XLM', to: 'USDC' });
  resolveFirst(quote); await first;
  assert.equal(flow.get().review?.amount, '2'); flow.clear(); assert.equal(flow.get().phase, 'idle');
});
test('explicit confirmation is single-use; uncertain swaps only verify and never re-broadcast', async () => {
  setup(); const quote = await prepare(); let submissions = 0; let checks = 0;
  const receipt = { hash: quote.hash, explorerUrl: '' };
  const flow = createSwapFlow({ source: () => key.publicKey(), prepare: async () => quote, submit: async () => { submissions++; throw new SubmissionUnknownError(quote.hash); }, check: async hash => { assert.equal(hash, quote.hash); checks++; return checks === 1 ? null : receipt; }, refresh: async () => { throw new Error('offline'); } });
  await flow.start(quote); assert.equal(submissions, 0);
  const pending = flow.confirm(); await flow.confirm(); await pending;
  assert.equal(flow.get().phase, 'unknown'); assert.equal(flow.clear(), false);
  await flow.start(quote); await flow.confirm(); assert.equal(submissions, 1);
  await flow.verify(); assert.equal(flow.get().phase, 'unknown');
  await flow.verify(); assert.equal(flow.get().phase, 'success');
  await flow.confirm(); assert.equal(submissions, 1);
});
test('a rejected swap invalidates its review and can only continue with a fresh quote', async () => {
  setup(); const quote = await prepare(); let prepares = 0;
  const flow = createSwapFlow({
    source: () => key.publicKey(),
    prepare: async () => { prepares++; return quote; },
    submit: async () => { throw new Error('La cotización expiró. Solicita otra antes de confirmar.'); },
    check: async () => null,
    refresh: async () => {},
  });
  await flow.start(quote); await flow.confirm();
  assert.equal(flow.get().phase, 'error');
  assert.equal(flow.get().review, undefined);
  await flow.confirm(); assert.equal(flow.get().phase, 'error');
  await flow.start(flow.get().input!); assert.equal(flow.get().phase, 'review');
  assert.equal(prepares, 2);
});
test('refreshing a temporarily expensive quote retries with fresh fee data', async () => {
  setup();
  let attempts = 0;
  const quote = await prepare();
  const flow = createSwapFlow({
    source: () => key.publicKey(),
    prepare: async () => {
      attempts++;
      if (attempts < 3) throw new Error('La comisión de red está temporalmente demasiado alta. Actualiza la cotización en unos segundos.');
      return quote;
    },
    submit: async () => ({ hash: quote.hash, explorerUrl: '' }),
    check: async () => null,
    refresh: async () => {},
  });
  await flow.start(quote);
  assert.equal(flow.get().phase, 'error');
  await flow.requote(0, 3);
  assert.equal(flow.get().phase, 'review');
  assert.equal(attempts, 3);
});
