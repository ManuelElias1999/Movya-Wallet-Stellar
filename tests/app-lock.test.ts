import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { idleLockDue, lockDecision, LOCK_AFTER_BACKGROUND_MS, LOCK_AFTER_IDLE_MS } from '../src/services/security/appLock';

test('returning after five minutes away expires the local session; the biometric sheet itself does not', () => {
  const left = lockDecision({ state: 'background', now: 1_000, backgroundAt: null });
  assert.deepEqual(left, { expire: false, backgroundAt: 1_000 });
  assert.equal(lockDecision({ state: 'active', now: 1_000 + LOCK_AFTER_BACKGROUND_MS, backgroundAt: 1_000 }).expire, true);
  assert.equal(lockDecision({ state: 'active', now: 1_000 + LOCK_AFTER_BACKGROUND_MS - 1, backgroundAt: 1_000 }).expire, false);
  assert.equal(lockDecision({ state: 'inactive', now: 5_000, backgroundAt: null }).backgroundAt, null);
  assert.equal(lockDecision({ state: 'inactive', now: 5_000, backgroundAt: 1_000 }).backgroundAt, 1_000);
});

test('five minutes without foreground activity shows the soft lock', () => {
  assert.equal(idleLockDue(1_000 + LOCK_AFTER_IDLE_MS - 1, 1_000), false);
  assert.equal(idleLockDue(1_000 + LOCK_AFTER_IDLE_MS, 1_000), true);
});
