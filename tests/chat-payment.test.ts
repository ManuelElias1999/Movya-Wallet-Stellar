import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createChatPaymentFlow, matchChatContacts } from '../src/services/chatPayment';
import { SubmissionUnknownError, type PaymentReview } from '../src/services/stellar/payments';
import { parseSendRequest } from '../src/services/chatIntent';

const review: PaymentReview = { source: 'sender', destination: 'prueba-address', amount: '1.0000000', asset: 'USDC', fee: '0.0000100', hash: 'a'.repeat(64), xdr: 'reviewed-transaction', expiresAt: 9999999999 };
const receipt = { hash: review.hash, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${review.hash}` };
const request = parseSendRequest('Envia 1 USDC a Prueba')!;
function setup(overrides: Partial<Parameters<typeof createChatPaymentFlow>[0]> = {}) {
  const calls = { prepare: 0, submit: 0, check: 0, refresh: 0 };
  const flow = createChatPaymentFlow({
    source: () => 'sender',
    resolve: async () => ({ destination: 'prueba-address', name: 'Prueba' }),
    prepare: async input => { calls.prepare++; assert.equal(input.destination, review.destination); assert.equal(input.asset, review.asset); return review; },
    submit: async actual => { calls.submit++; assert.equal(actual, review); return receipt; },
    check: async hash => { calls.check++; assert.equal(hash, review.hash); return receipt; },
    refresh: async () => { calls.refresh++; },
    ...overrides,
  });
  return { flow, calls };
}

test('Envia 1 USDC a Prueba prepares a real review and submits only after confirmation', async () => {
  const { flow, calls } = setup();
  await flow.start(request);
  assert.equal(flow.get().phase, 'review');
  assert.equal(flow.get().recipient, 'Prueba');
  assert.equal(flow.get().review?.fee, '0.0000100');
  assert.equal(calls.submit, 0);
  await flow.confirm();
  assert.equal(flow.get().phase, 'success');
  assert.deepEqual(flow.get().receipt, receipt);
  assert.equal(calls.submit, 1);
  assert.equal(calls.refresh, 1);
  await flow.confirm();
  assert.equal(calls.submit, 1);
});

test('cancel and old confirmations cannot submit', async () => {
  const { flow, calls } = setup();
  await flow.start(request);
  assert.equal(flow.cancel(), true);
  await flow.confirm();
  assert.equal(flow.get().phase, 'idle');
  assert.equal(calls.submit, 0);
});

test('rapid double confirmation and new requests during submission do not broadcast twice', async () => {
  let finish!: (value: typeof receipt) => void;
  let submissions = 0;
  const { flow, calls } = setup({ submit: () => { submissions++; return new Promise(resolve => { finish = resolve; }); } });
  await flow.start(request);
  const pending = flow.confirm();
  await flow.confirm(); await flow.start({ ...request, amount: '2' });
  assert.equal(submissions, 1);
  assert.equal(calls.prepare, 1);
  assert.equal(flow.cancel(), false);
  finish(receipt); await pending;
  assert.equal(flow.get().phase, 'success');
});

test('uncertain broadcast only checks its original hash and blocks resending', async () => {
  let checks = 0; let submissions = 0;
  const { flow, calls } = setup({
    submit: async () => { submissions++; throw new SubmissionUnknownError(review.hash); },
    check: async hash => { assert.equal(hash, review.hash); checks++; return checks === 1 ? null : receipt; },
  });
  await flow.start(request); await flow.confirm();
  assert.equal(flow.get().phase, 'unknown');
  await flow.confirm(); await flow.start(request);
  assert.equal(flow.cancel(), false);
  assert.equal(calls.prepare, 1);
  assert.equal(submissions, 1);
  await flow.verify();
  assert.equal(flow.get().phase, 'unknown');
  await flow.verify();
  assert.equal(flow.get().phase, 'success');
  assert.equal(submissions, 1);
});

test('failed status checks preserve the pending hash; a refresh failure never retries a successful payment', async () => {
  const { flow } = setup({ submit: async () => { throw new SubmissionUnknownError(review.hash); }, check: async () => { throw new Error('offline'); } });
  await flow.start(request); await flow.confirm(); await flow.verify();
  assert.equal(flow.get().phase, 'unknown');
  assert.equal(flow.get().review?.hash, review.hash);
  const success = setup({ refresh: async () => { throw new Error('offline'); } });
  await success.flow.start(request); await success.flow.confirm();
  await Promise.resolve();
  assert.equal(success.flow.get().phase, 'success');
  await success.flow.confirm();
  assert.equal(success.calls.submit, 1);
});

test('duplicate names require an explicit contact choice before preparing a transaction', async () => {
  const choices = [{ id: '1', name: 'Prueba', handle: 'one@example.com' }, { id: '2', name: 'Prueba', handle: 'two@example.com' }];
  const { flow, calls } = setup({ resolve: async (_, id) => id ? { destination: 'prueba-address', name: choices.find(c => c.id === id)!.name } : { choices } });
  await flow.start(request); await flow.confirm();
  assert.equal(flow.get().phase, 'choosing');
  assert.equal(calls.prepare, 0);
  assert.deepEqual(flow.get().choices, choices);
  await flow.start(request, '2');
  assert.equal(flow.get().phase, 'review');
  assert.equal(calls.submit, 0);
});

test('unknown recipients, unsupported assets, and missing wallets never submit', async () => {
  const missing = setup({ resolve: async () => { throw new Error('No encontré ese contacto.'); } });
  await missing.flow.start(request); await missing.flow.confirm();
  assert.equal(missing.flow.get().phase, 'error'); assert.equal(missing.calls.prepare, 0);
  const unsupported = setup(); await unsupported.flow.start({ ...request, token: 'BTC' });
  assert.equal(unsupported.flow.get().phase, 'error'); assert.equal(unsupported.calls.prepare, 0);
  const noWallet = setup({ source: () => null }); await noWallet.flow.start(request);
  assert.equal(noWallet.flow.get().phase, 'error'); assert.equal(noWallet.calls.submit, 0);
});

test('a wallet change during preparation or before confirmation invalidates the review', async () => {
  let source = 'sender';
  const { flow, calls } = setup({ source: () => source });
  await flow.start(request); source = 'other-user'; await flow.confirm();
  assert.equal(flow.get().phase, 'error'); assert.equal(calls.submit, 0);
  source = 'sender';
  const changed = setup({ source: () => source, resolve: async () => { source = 'other-user'; return { destination: 'prueba-address', name: 'Prueba' }; } });
  await changed.flow.start(request);
  assert.equal(changed.flow.get().phase, 'error'); assert.equal(changed.calls.prepare, 0);
});

test('name matching accepts accents/case, email and exact public addresses without guessing partial names', () => {
  const contacts = [{ id: '1', name: 'Prúeba', handle: 'p@example.com', email: 'p@example.com', address: 'GADDRESS' }];
  assert.equal(matchChatContacts(contacts, '  PRUEBA ').length, 1);
  assert.equal(matchChatContacts(contacts, 'P@EXAMPLE.COM').length, 1);
  assert.equal(matchChatContacts(contacts, 'GADDRESS').length, 1);
  assert.equal(matchChatContacts(contacts, 'pru').length, 0);
});
