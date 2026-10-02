import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { decryptWallet, encryptWallet } from '../src/services/backend/vault';

test('wallet backup recovers exactly the same key and authenticates password, owner, address and ciphertext', async () => {
  const pair = Keypair.random(); const password = 'mi-contraseña-de-pruebas-2026'; const owner = 'test-user-1';
  const backup = await encryptWallet(pair.secret(), password, owner);
  assert.equal(JSON.stringify(backup).includes(pair.secret()), false);
  assert.equal(await decryptWallet(backup, password, owner, pair.publicKey()), pair.secret());
  const second = await encryptWallet(pair.secret(), password, owner);
  assert.notEqual(second.salt, backup.salt); assert.notEqual(second.nonce, backup.nonce);
  for (const [candidate, pass, user, address] of [
    [backup, 'contraseña-incorrecta', owner, pair.publicKey()],
    [backup, password, 'otro-usuario', pair.publicKey()],
    [backup, password, owner, Keypair.random().publicKey()],
    [{ ...backup, ciphertext: (backup.ciphertext[0] === 'a' ? 'b' : 'a') + backup.ciphertext.slice(1) }, password, owner, pair.publicKey()],
  ] as const) await assert.rejects(decryptWallet(candidate, pass, user, address));
});
test('rejects malformed backups and short passwords before deriving a key', async () => {
  const pair = Keypair.random();
  await assert.rejects(encryptWallet(pair.secret(), 'short', 'user'));
  await assert.rejects(decryptWallet({ version: 1, salt: '', nonce: '', ciphertext: '' }, 'password', 'user', pair.publicKey()));
});
