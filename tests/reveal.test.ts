import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createRecoveryWallet } from '../src/services/stellar/recovery';
import { revealRecovery } from '../src/services/backend/revealRecovery';

test('recovery disclosure verifies the password and exact account before reading a secret', async () => {
  let reads = 0; const wallet = createRecoveryWallet();
  const input = { owner: 'owner', password: 'password', stillCurrent: () => true, authenticate: async () => 'owner', read: async () => { reads++; return wallet; } };
  await assert.rejects(revealRecovery({ ...input, password: '' }));
  await assert.rejects(revealRecovery({ ...input, authenticate: async () => { throw new Error('wrong password'); } }));
  await assert.rejects(revealRecovery({ ...input, authenticate: async () => 'another-user' }));
  assert.equal(reads, 0);
  const revealed = await revealRecovery(input);
  assert.equal(revealed.secret, wallet.secret); assert.equal(revealed.mnemonic, wallet.mnemonic); assert.equal(reads, 1);
});
test('an account change during authentication or storage access prevents recovery disclosure', async () => {
  let current = true; let reads = 0; const wallet = createRecoveryWallet();
  const input = { owner: 'owner', password: 'password', stillCurrent: () => current, authenticate: async () => { current = false; return 'owner'; }, read: async () => { reads++; return wallet; } };
  await assert.rejects(revealRecovery(input)); assert.equal(reads, 0);
  current = true;
  await assert.rejects(revealRecovery({ ...input, authenticate: async () => 'owner', read: async () => { current = false; return wallet; } }));
});
