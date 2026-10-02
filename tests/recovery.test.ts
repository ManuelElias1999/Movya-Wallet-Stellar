import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { Keypair } from '@stellar/stellar-sdk/base';
import { recoverWallet, type WalletRecord } from '../src/services/backend/walletRecovery';

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
