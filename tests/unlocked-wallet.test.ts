import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createUnlockedWalletSession } from '../src/services/security/unlockedWallet';

test('an unlocked signing key is account-bound and disappears on lock or logout', () => {
  const session = createUnlockedWalletSession<{ secret: string }>();
  session.open('manuel', { secret: 'manuel-secret' });
  assert.equal(session.read('manuel', true)?.secret, 'manuel-secret');
  assert.equal(session.read('friend', true), null);
  assert.equal(session.read('manuel', false), null);
  session.clear();
  assert.equal(session.read('manuel', true), null);
});
