import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Account, Asset, Keypair, Memo, Networks, Operation, Transaction, TransactionBuilder } from '@stellar/stellar-sdk/base';
import { classifyTransaction, type TransactionLike } from '../src/services/stellar/signingPolicy';
import { buildRotation } from '../src/services/stellar/signerTransactions';
import { USDC_ISSUER, type TestnetAccount } from '../src/services/stellar/payments';
import { MOVYA_TREASURY } from '../src/services/stellar/swaps';

// The policy reads decoded SDK fields; these tests pin that contract to real
// transactions so an SDK change cannot silently weaken the signer.
const me = Keypair.random(), friend = Keypair.random(), kit = Keypair.random(), device = Keypair.random();
const now = Math.floor(Date.now() / 1000);
const policy = { account: me.publicKey(), usdcIssuer: USDC_ISSUER, treasury: MOVYA_TREASURY };
const decode = (tx: Transaction) => new Transaction(tx.toXDR(), Networks.TESTNET) as unknown as TransactionLike;
const build = (...ops: ReturnType<typeof Operation.payment>[]) => {
  const builder = new TransactionBuilder(new Account(me.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET });
  ops.forEach(op => builder.addOperation(op));
  return builder.setTimebounds(0, now + 180).build();
};
const usdc = new Asset('USDC', USDC_ISSUER);

test('real Movya transactions are recognized', () => {
  assert.equal(classifyTransaction(decode(build(Operation.payment({ destination: friend.publicKey(), asset: usdc, amount: '1' }))), policy), 'payment');
  assert.equal(classifyTransaction(decode(build(
    Operation.payment({ destination: MOVYA_TREASURY, asset: Asset.native(), amount: '0.25' }),
    Operation.pathPaymentStrictSend({ sendAsset: Asset.native(), sendAmount: '49.75', destination: me.publicKey(), destAsset: usdc, destMin: '1', path: [] }),
  )), policy), 'swap');
  assert.equal(classifyTransaction(decode(build(Operation.changeTrust({ asset: usdc }))), policy), 'trustline');
  const setup = build(Operation.setOptions({ signer: { ed25519PublicKey: kit.publicKey(), weight: 2 }, masterWeight: 1, lowThreshold: 1, medThreshold: 1, highThreshold: 2 }));
  assert.equal(classifyTransaction(decode(setup), { ...policy, recoverySigner: kit.publicKey() }), 'recovery-setup');
});

test('real dangerous transactions are refused', () => {
  for (const op of [
    Operation.accountMerge({ destination: friend.publicKey() }),
    Operation.setOptions({ signer: { ed25519PublicKey: friend.publicKey(), weight: 255 } }),
    Operation.setOptions({ masterWeight: 0 }),
    Operation.manageData({ name: 'x', value: 'y' }),
    Operation.changeTrust({ asset: usdc, limit: '0' }),
    Operation.payment({ destination: friend.publicKey(), asset: new Asset('USDC', friend.publicKey()), amount: '1' }),
  ]) assert.throws(() => classifyTransaction(decode(build(op as ReturnType<typeof Operation.payment>)), { ...policy, recoverySigner: kit.publicKey() }), /no firmará/);
  const withMemo = new TransactionBuilder(new Account(me.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET, memo: Memo.text('x') })
    .addOperation(Operation.payment({ destination: friend.publicKey(), asset: Asset.native(), amount: '1' })).setTimebounds(0, now + 60).build();
  assert.throws(() => classifyTransaction(decode(withMemo), policy), /memo/);
  const forever = new TransactionBuilder(new Account(me.publicKey(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: friend.publicKey(), asset: Asset.native(), amount: '1' })).setTimeout(0).build();
  assert.throws(() => classifyTransaction(decode(forever), policy), /expiración/);
});

test('rotation adds the new device key and disables the old master key', () => {
  const account: TestnetAccount = { account_id: me.publicKey(), sequence: '1', balances: [], subentry_count: 1,
    signers: [{ key: me.publicKey(), weight: 1, type: 'ed25519_public_key' }, { key: kit.publicKey(), weight: 2, type: 'ed25519_public_key' }],
    thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 2 } };
  const tx = buildRotation(account, kit.publicKey(), device.publicKey(), 100n);
  const ops = (decode(tx) as unknown as { operations: Record<string, unknown>[] }).operations;
  assert.deepEqual(ops.map(op => op.type), ['setOptions', 'setOptions']);
  assert.deepEqual(ops[0].signer, { ed25519PublicKey: device.publicKey(), weight: 1 });
  assert.equal(ops[1].masterWeight, 0);
  // The device key itself may never sign a rotation.
  assert.throws(() => classifyTransaction(decode(tx), { ...policy, recoverySigner: kit.publicKey() }));
});

test('a real emergency transfer is accepted only towards the new wallet', async () => {
  const { buildSweep } = await import('../src/services/stellar/sweep');
  const fresh = Keypair.random();
  const account: TestnetAccount = { account_id: me.publicKey(), sequence: '1', subentry_count: 1,
    balances: [{ asset_type: 'native', balance: '100' }, { asset_type: 'credit_alphanum4', asset_code: 'USDC', asset_issuer: USDC_ISSUER, balance: '12', limit: '1000', is_authorized: true }],
    signers: [{ key: me.publicKey(), weight: 1, type: 'ed25519_public_key' }], thresholds: { low_threshold: 0, med_threshold: 0, high_threshold: 0 } };
  const { tx, merge } = buildSweep(account, fresh.publicKey(), { fee: 100n, reserve: 15_000_000n, baseReserve: 5_000_000n }, me.publicKey());
  assert.equal(merge, true);
  const decoded = decode(new Transaction(tx.toXDR(), Networks.TESTNET));
  assert.equal(classifyTransaction(decoded, { ...policy, sweepTo: fresh.publicKey() }), 'sweep');
  assert.throws(() => classifyTransaction(decoded, { ...policy, sweepTo: friend.publicKey() }));
  // With a recovery kit the device cannot merge: XLM is paid instead, reserve stays.
  const guarded = { ...account, signers: [...account.signers!, { key: kit.publicKey(), weight: 2, type: 'ed25519_public_key' }], thresholds: { low_threshold: 1, med_threshold: 1, high_threshold: 2 } };
  const partial = buildSweep(guarded, fresh.publicKey(), { fee: 100n, reserve: 20_000_000n, baseReserve: 5_000_000n }, me.publicKey());
  assert.equal(partial.merge, false);
  const ops = (decode(partial.tx) as unknown as { operations: { type: string }[] }).operations.map(op => op.type);
  assert.deepEqual(ops, ['createAccount', 'changeTrust', 'payment', 'changeTrust', 'payment']);
});
