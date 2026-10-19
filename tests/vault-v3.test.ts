import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { deriveAccountKeys, newKdfSalt, V3_BACKUP_LABEL, V3_LOGIN_LABEL } from '../src/services/backend/accountKeys';
import { BackupDecryptError, decryptRecovery, encryptRecoveryV3 } from '../src/services/backend/vault';
import { createRecoveryWallet } from '../src/services/stellar/recovery';
import { assertPasswordNotLeaked } from '../src/services/backend/passwordPolicy';

const password = 'contraseña-de-pruebas-v3';

test('one password yields a login secret and a backup key that are unrelated and stable', async () => {
  assert.notEqual(V3_LOGIN_LABEL, V3_BACKUP_LABEL);
  const salt = newKdfSalt();
  const first = await deriveAccountKeys(password, salt), again = await deriveAccountKeys(password, salt);
  assert.match(first.loginSecret, /^Mv3![a-f0-9]{64}$/);
  assert.ok(Buffer.byteLength(first.loginSecret) <= 72);
  assert.equal(first.loginSecret, again.loginSecret);
  assert.deepEqual(first.backupKey, again.backupKey);
  assert.ok(!first.loginSecret.includes(Buffer.from(first.backupKey).toString('hex')));
  assert.notEqual((await deriveAccountKeys(password, newKdfSalt())).loginSecret, first.loginSecret);
  assert.notEqual((await deriveAccountKeys(password + '!', salt)).loginSecret, first.loginSecret);
});

test('a v3 backup opens with the typed password alone and is bound to the owner and account', async () => {
  const material = createRecoveryWallet();
  const account = Keypair.fromSecret(material.secret).publicKey();
  const keys = await deriveAccountKeys(password, newKdfSalt());
  const backup = encryptRecoveryV3(material, keys, 'owner');
  assert.equal(backup.version, 3); assert.equal(backup.salt, keys.salt);
  assert.ok(!JSON.stringify(backup).includes(material.secret));
  assert.deepEqual(await decryptRecovery(backup, password, 'owner', account), material);
  assert.deepEqual(await decryptRecovery(backup, { password, keys }, 'owner', account), material);
  await assert.rejects(decryptRecovery(backup, 'otra-contraseña-larga', 'owner', account), BackupDecryptError);
  await assert.rejects(decryptRecovery(backup, password, 'intruso', account), BackupDecryptError);
  await assert.rejects(decryptRecovery(backup, password, 'owner', Keypair.random().publicKey()), BackupDecryptError);
});

test('a rotated signer is stored with the account it controls', async () => {
  const signer = createRecoveryWallet(); const account = Keypair.random().publicKey();
  const keys = await deriveAccountKeys(password, newKdfSalt());
  const backup = encryptRecoveryV3({ ...signer, accountId: account }, keys, 'owner');
  assert.deepEqual(await decryptRecovery(backup, password, 'owner', account), { ...signer, accountId: account });
  await assert.rejects(decryptRecovery(backup, password, 'owner', Keypair.fromSecret(signer.secret).publicKey()), BackupDecryptError);
});

test('leaked-password check sends only a 5-character prefix and fails open on network errors', async () => {
  const urls: string[] = [];
  // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const leaky = (async (url: string) => { urls.push(url); return new Response('1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\r\n0000000000000000000000000000000000:0'); }) as typeof fetch;
  await assert.rejects(assertPasswordNotLeaked('password', leaky), /filtraciones/);
  assert.deepEqual(urls, ['https://api.pwnedpasswords.com/range/5BAA6']);
  await assertPasswordNotLeaked('una-contraseña-única-2026', leaky);
  await assertPasswordNotLeaked('password', (async () => { throw new TypeError('offline'); }) as typeof fetch);
});
