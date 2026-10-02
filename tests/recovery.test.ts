import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { recoverWallet, type WalletRecord } from '../src/services/backend/walletRecovery';
import { encryptWallet, fingerprintBackup } from '../src/services/backend/vault';
import type { StoredWallet } from '../src/services/backend/storage';

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

test('verified native login reuses the exact saved backup while other devices still decrypt', async () => {
  const password = 'contraseña-de-pruebas-segura';
  let record: WalletRecord | null = null; let local: StoredWallet | null = null;
  let registrations = 0;
  const stages: string[] = [];
  const storage = {
    getBackup: async () => record,
    register: async (public_key: string, backup: WalletRecord['backup']) => {
      registrations++; record = { owner_id: 'owner', public_key, backup }; return record;
    },
    readLocal: async () => local,
    writeLocal: async (value: StoredWallet) => { local = value; },
  };
  const options = { allowLocalCache: true, onProgress: (stage: string) => stages.push(stage) };
  const address = await recoverWallet(storage, 'owner', password, false, options);
  const saved = (await storage.readLocal())!;
  assert.equal(saved.backupFingerprint, fingerprintBackup(record!.backup, 'owner', address));
  local = { ...saved, backupAcknowledged: true, oualiAddress: 'saved-contact' };
  stages.length = 0;
  assert.equal(await recoverWallet(storage, 'owner', password, false, options), address);
  assert.deepEqual(stages, ['reading', 'local', 'saving']);
  assert.deepEqual(await storage.readLocal(), { ...saved, backupAcknowledged: true, oualiAddress: 'saved-contact' });

  // Existing installs verify the backup once before receiving the cache marker.
  local = { ...saved, backupFingerprint: undefined }; stages.length = 0;
  await recoverWallet(storage, 'owner', password, false, options);
  assert.deepEqual(stages, ['reading', 'decrypting', 'saving']);
  assert.equal((await storage.readLocal())?.backupFingerprint, saved.backupFingerprint);

  // A new device has no protected cache and restores the same words/address.
  local = null; stages.length = 0;
  assert.equal(await recoverWallet(storage, 'owner', password, false, options), address);
  assert.deepEqual(stages, ['reading', 'decrypting', 'saving']);
  assert.equal((await storage.readLocal())?.mnemonic, saved.mnemonic);
  assert.equal(registrations, 1);

  // Generic/web recovery cannot opt into credential trust implicitly.
  await assert.rejects(recoverWallet(storage, 'owner', 'wrong-password', false), /No se pudo abrir/);
});

test('a native cache cannot bypass a changed backup, owner or local address', async () => {
  const pair = Keypair.random(); const password = 'test-password-long-enough';
  const backup = await encryptWallet(pair.secret(), password, 'owner');
  const original: WalletRecord = { owner_id: 'owner', public_key: pair.publicKey(), backup };
  let record = original; let writes = 0;
  let local: StoredWallet = { secret: pair.secret(), oualiAddress: '', backupFingerprint: fingerprintBackup(backup, 'owner', pair.publicKey()) };
  const stages: string[] = [];
  const storage = {
    getBackup: async () => record,
    register: async () => { throw new Error('Must not register'); },
    readLocal: async () => local,
    writeLocal: async () => { writes++; },
  };
  const options = { allowLocalCache: true, onProgress: (stage: string) => stages.push(stage) };
  record = { ...original, backup: { ...backup, ciphertext: (backup.ciphertext[0] === 'a' ? 'b' : 'a') + backup.ciphertext.slice(1) } };
  await assert.rejects(recoverWallet(storage, 'owner', password, false, options), /No se pudo abrir/);
  assert.ok(stages.includes('decrypting')); assert.ok(!stages.includes('local'));
  record = { ...original, owner_id: 'another-user' };
  await assert.rejects(recoverWallet(storage, 'owner', password, false, options), /no corresponde/);
  record = original; local = { ...local, secret: Keypair.random().secret() };
  await assert.rejects(recoverWallet(storage, 'owner', password, false, options), /no coincide/);
  assert.equal(writes, 0);
});

test('cancelling a cached native access before reading finishes prevents a write', async () => {
  const pair = Keypair.random(); const password = 'test-password-long-enough';
  const backup = await encryptWallet(pair.secret(), password, 'owner');
  const controller = new AbortController(); let writes = 0;
  await assert.rejects(recoverWallet({
    getBackup: async () => ({ owner_id: 'owner', public_key: pair.publicKey(), backup }),
    register: async () => { throw new Error('Must not register'); },
    readLocal: async () => {
      controller.abort(new Error('Cancelled'));
      return { secret: pair.secret(), oualiAddress: '', backupFingerprint: fingerprintBackup(backup, 'owner', pair.publicKey()) };
    },
    writeLocal: async () => { writes++; },
  }, 'owner', password, false, { allowLocalCache: true, signal: controller.signal }), /Cancelled/);
  assert.equal(writes, 0);
});
