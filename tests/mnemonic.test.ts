import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { createRecoveryWallet, walletFromMnemonic, validateRecoveryMaterial } from '../src/services/stellar/recovery';
import { encryptRecovery, decryptRecovery } from '../src/services/backend/vault';

test('12-word derivation matches the official Stellar SEP-0005 account-zero test vector', () => {
  // Public specification test vector. Never use it for an actual wallet.
  const vector = walletFromMnemonic('illness spike retreat truth genius clock brain pass fit cave bargain toe');
  assert.equal(Keypair.fromSecret(vector.secret).publicKey(), 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOOHSUJUJ6');
  assert.equal(vector.secret, 'SBGWSG6BTNCKCOB3DIFBGCVMUPQFYPA2G4O34RMTB343OYPXU5DJDVMN');
});
test('new phrases have 12 words and reproduce the same key; malformed or mismatched phrases fail', () => {
  const wallet = createRecoveryWallet(); const other = createRecoveryWallet();
  assert.equal(wallet.mnemonic.split(' ').length, 12);
  assert.equal(walletFromMnemonic(wallet.mnemonic).secret, wallet.secret);
  assert.equal(walletFromMnemonic(`  ${wallet.mnemonic.toUpperCase().replaceAll(' ', '  ')}  `).secret, wallet.secret);
  assert.notEqual(wallet.mnemonic, other.mnemonic);
  assert.throws(() => walletFromMnemonic(wallet.mnemonic.split(' ').slice(1).join(' ')));
  assert.throws(() => walletFromMnemonic('invalid '.repeat(12)));
  assert.throws(() => validateRecoveryMaterial({ secret: wallet.secret, mnemonic: other.mnemonic }));
});
test('version-two backup encrypts both the mnemonic and the secret and restores their original address', async () => {
  const wallet = createRecoveryWallet(); const owner = 'owner'; const password = 'contraseña-de-pruebas-segura';
  const backup = await encryptRecovery(wallet, password, owner);
  assert.equal(backup.version, 2);
  assert.equal(JSON.stringify(backup).includes(wallet.secret), false);
  assert.equal(JSON.stringify(backup).includes(wallet.mnemonic), false);
  const recovered = await decryptRecovery(backup, password, owner, Keypair.fromSecret(wallet.secret).publicKey());
  assert.deepEqual(recovered, wallet);
  await assert.rejects(decryptRecovery({ ...backup, version: 1 }, password, owner, Keypair.fromSecret(wallet.secret).publicKey()));
});
