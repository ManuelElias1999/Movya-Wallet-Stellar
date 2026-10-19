import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertDeviceCanSign, assertRecoveryCanRotate, recoveryState, signersToRevoke, signerWeight } from '../src/services/stellar/signers';
import type { TestnetAccount } from '../src/services/stellar/payments';

const ACCOUNT = 'G' + 'A'.repeat(55), KIT = 'G' + 'K'.repeat(55), NEW = 'G' + 'N'.repeat(55), THIEF = 'G' + 'T'.repeat(55);
const key = (k: string, weight: number) => ({ key: k, weight, type: 'ed25519_public_key' });
const account = (signers: TestnetAccount['signers'], low = 0, med = 0, high = 0): TestnetAccount =>
  ({ account_id: ACCOUNT, sequence: '1', balances: [], subentry_count: 0, signers, thresholds: { low_threshold: low, med_threshold: med, high_threshold: high } });

const fresh = account([key(ACCOUNT, 1)]);
const protectedAccount = account([key(ACCOUNT, 1), key(KIT, 2)], 1, 1, 2);
const rotated = account([key(ACCOUNT, 0), key(KIT, 2), key(NEW, 1)], 1, 1, 2);

test('a new account is unprotected; the expected setup is recognized', () => {
  assert.deepEqual(recoveryState(fresh, ACCOUNT), { kind: 'unprotected' });
  assert.deepEqual(recoveryState(protectedAccount, ACCOUNT), { kind: 'protected', recoverySigners: [KIT] });
  assert.deepEqual(recoveryState(rotated, NEW), { kind: 'protected', recoverySigners: [KIT] });
});

test('foreign signers or thresholds are reported, never treated as protection', () => {
  assert.equal(recoveryState(account([key(ACCOUNT, 1), key(THIEF, 1)], 1, 1, 1), ACCOUNT).kind, 'unexpected');
  assert.equal(recoveryState(account([key(ACCOUNT, 1), key(KIT, 2)], 1, 1, 1), ACCOUNT).kind, 'unexpected');
  assert.equal(recoveryState(account([key(ACCOUNT, 1), key(KIT, 2), key(THIEF, 2)], 1, 1, 2), ACCOUNT).kind, 'protected');
});

test('the device key can pay but can never meet the threshold to change signers', () => {
  assertDeviceCanSign(protectedAccount, ACCOUNT);
  assert.ok(signerWeight(protectedAccount, ACCOUNT) < protectedAccount.thresholds!.high_threshold);
  assertRecoveryCanRotate(protectedAccount, KIT);
  assert.throws(() => assertRecoveryCanRotate(protectedAccount, ACCOUNT), /permiso suficiente/);
  assert.throws(() => assertRecoveryCanRotate(protectedAccount, THIEF), /no está registrado/);
});

test('after rotation the old key is refused before signing and the new one works', () => {
  assert.throws(() => assertDeviceCanSign(rotated, ACCOUNT), /desactivado/);
  assertDeviceCanSign(rotated, NEW);
});

test('rotation disables every device key except the recovery kit and the new key', () => {
  assert.deepEqual(signersToRevoke(protectedAccount, KIT, NEW), [{ key: ACCOUNT, master: true }]);
  const second = account([key(ACCOUNT, 0), key(KIT, 2), key(NEW, 1)], 1, 1, 2);
  assert.deepEqual(signersToRevoke(second, KIT, THIEF), [{ key: NEW, master: false }]);
  assert.deepEqual(signersToRevoke({ ...fresh, signers: undefined }, KIT, NEW), [{ key: ACCOUNT, master: true }]);
});
