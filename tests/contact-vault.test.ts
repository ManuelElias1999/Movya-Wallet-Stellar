import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ContactBackupRollbackError, createContactVault, type KnownVersion, type RemoteContactBackup } from '../src/services/backend/contactVault';

// Toy cipher: reversible and bound to the AAD, enough to test the protocol.
const seal = (plaintext: string, aad: string) => ({ nonce: 'n'.repeat(24), ciphertext: Buffer.from(`${aad}|${plaintext}`).toString('hex') });
const open = (backup: { ciphertext: string }, aad: string) => {
  const text = Buffer.from(backup.ciphertext, 'hex').toString();
  if (!text.startsWith(`${aad}|`)) throw new Error('auth failed');
  return text.slice(aad.length + 1);
};
function device(server: { row: RemoteContactBackup }) {
  let known: KnownVersion | null = null;
  const vault = createContactVault('owner', {
    fetch: async () => server.row,
    put: async (version, backup) => { if ((server.row?.version ?? 0) !== version - 1) throw new Error('conflict'); server.row = { version, backup }; },
    readKnown: async () => known, writeKnown: async next => { known = next; },
    seal, open, hash: value => value.length + ':' + value.slice(-16), now: () => 1,
  });
  return { vault, known: () => known };
}
const aya = { name: 'Aya', address: 'G' + 'A'.repeat(55), verifiedAt: 1 };

test('a new device restores the contacts another device saved', async () => {
  const server = { row: null as RemoteContactBackup };
  const first = device(server), second = device(server);
  assert.deepEqual(await first.vault.load(), {});
  assert.equal(await first.vault.save({ c1: aya }), 1);
  assert.deepEqual(await second.vault.load(), { c1: aya });
  assert.equal(await second.vault.save({ c1: aya, c2: { ...aya, name: 'Bob' } }), 2);
  assert.equal(Object.keys(await first.vault.load()).length, 2);
});

test('a device that saw version N refuses an older or altered copy', async () => {
  const server = { row: null as RemoteContactBackup };
  const phone = device(server);
  await phone.vault.save({ c1: aya });
  const v1 = server.row;
  await phone.vault.save({ c1: { ...aya, name: 'Aya López' } });
  server.row = v1; // compromised server replays the old copy
  await assert.rejects(phone.vault.load(), ContactBackupRollbackError);
  await assert.rejects(phone.vault.save({}), ContactBackupRollbackError);
  server.row = { version: 2, backup: seal('{}', 'other') };
  await assert.rejects(phone.vault.load(), ContactBackupRollbackError);
  server.row = null;
  await assert.rejects(phone.vault.load(), ContactBackupRollbackError);
});

test('a copy moved to another version number fails authentication', async () => {
  const server = { row: null as RemoteContactBackup };
  const phone = device(server);
  await phone.vault.save({ c1: aya });
  const fresh = device({ row: { version: 7, backup: server.row!.backup } });
  await assert.rejects(fresh.vault.load(), /auth failed/);
});
