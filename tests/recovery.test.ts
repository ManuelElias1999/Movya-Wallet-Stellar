import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { recoverWallet, type WalletRecord } from '../src/services/backend/walletRecovery';
import { encryptWallet } from '../src/services/backend/vault';

test('linking an existing developer wallet keeps its address; later login recovers it on another device', async () => {
  const legacy = Keypair.random(); const userId = 'owner'; const password = 'mi-contraseña-de-pruebas-2026';
  let record: WalletRecord | null = null; let registrations = 0; let writes = 0;
  let local: { secret: string; oualiAddress: string } | null = null;
  const storage = {
    getBackup: async () => record,
    register: async (public_key: string, backup: WalletRecord['backup']) => {
      registrations++; record = { owner_id: userId, public_key, backup }; return record;
    },
    readLocal: async (owner?: string) => owner ? local : { secret: legacy.secret(), oualiAddress: '' },
    writeLocal: async (value: { secret: string; oualiAddress: string }) => { writes++; local = value; },
  };
  assert.equal(await recoverWallet(storage, userId, password, true), legacy.publicKey());
  local = null;
  assert.equal(await recoverWallet(storage, userId, password, false), legacy.publicKey());
  assert.equal(registrations, 1); assert.equal(writes, 2);
  await assert.rejects(recoverWallet(storage, userId, 'contraseña-incorrecta', false));
  assert.equal(registrations, 1); assert.equal(writes, 2);
  await assert.rejects(recoverWallet({ ...storage, getBackup: async () => { throw new Error('offline'); } }, userId, password, true), /offline/);
  assert.equal(registrations, 1); assert.equal(writes, 2);
});
test('an unrelated user cannot restore a backup or write a key to storage', async () => {
  const storage = {
    getBackup: async () => ({ owner_id: 'other', public_key: Keypair.random().publicKey(), backup: { version: 1 as const, salt: '', nonce: '', ciphertext: '' } }),
    register: async () => { throw new Error('Unexpected registration'); },
    readLocal: async () => null,
    writeLocal: async () => { throw new Error('Unexpected storage write'); },
  };
  await assert.rejects(recoverWallet(storage, 'owner', 'mi-contraseña-de-pruebas', false), /no corresponde/);
});

test('a new account receives a mnemonic wallet and restores its words without creating another key', async () => {
  let record: WalletRecord | null = null;
  let local: { secret: string; mnemonic?: string; oualiAddress: string; backupAcknowledged?: boolean } | null = null;
  let registrations = 0;
  const storage = {
    getBackup: async () => record,
    register: async (public_key: string, backup: WalletRecord['backup']) => { registrations++; record = { owner_id: 'owner', public_key, backup }; return record; },
    readLocal: async () => local,
    writeLocal: async (value: { secret: string; mnemonic?: string; oualiAddress: string }) => { local = value; },
  };
  const password = 'contraseña-de-pruebas-segura';
  const stages: string[] = [];
  const address = await recoverWallet(storage, 'owner', password, false, { onProgress: stage => stages.push(stage) });
  assert.deepEqual(stages, ['reading', 'creating', 'encrypting', 'registering', 'saving']);
  const first = await storage.readLocal();
  assert.equal(first?.mnemonic?.split(' ').length, 12);
  assert.equal((record as WalletRecord | null)?.backup.version, 2);
  local = null;
  stages.length = 0;
  assert.equal(await recoverWallet(storage, 'owner', password, false, { onProgress: stage => stages.push(stage) }), address);
  assert.deepEqual(stages, ['reading', 'decrypting', 'saving']);
  const second = await storage.readLocal();
  assert.equal(second?.mnemonic, first?.mnemonic); assert.equal(registrations, 1);
});

test('a different registration winner is decrypted instead of storing the losing candidate', async () => {
  const winner = Keypair.random(); const password = 'test-password-long-enough';
  const backup = await encryptWallet(winner.secret(), password, 'owner');
  let stored: { secret: string } | null = null; const stages: string[] = [];
  const result = await recoverWallet({
    getBackup: async () => null,
    register: async () => ({ owner_id: 'owner', public_key: winner.publicKey(), backup }),
    readLocal: async () => null,
    writeLocal: async value => { stored = value; },
  }, 'owner', password, false, { onProgress: stage => stages.push(stage) });
  assert.equal(result, winner.publicKey());
  assert.equal((stored as { secret: string } | null)?.secret, winner.secret());
  assert.ok(stages.includes('decrypting'));
});

test('matching public keys alone never bypass decryption of a different returned backup', async () => {
  const legacy = Keypair.random(); const stages: string[] = []; let writes = 0;
  const backup = await encryptWallet(legacy.secret(), 'a-different-long-password', 'owner');
  await assert.rejects(recoverWallet({
    getBackup: async () => null,
    register: async () => ({ owner_id: 'owner', public_key: legacy.publicKey(), backup }),
    readLocal: async () => ({ secret: legacy.secret(), oualiAddress: '' }),
    writeLocal: async () => { writes++; },
  }, 'owner', 'test-password-long-enough', true, { onProgress: stage => stages.push(stage) }), /No se pudo abrir/);
  assert.ok(stages.includes('decrypting')); assert.equal(writes, 0);
});
