import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { lockDecision, LOCK_AFTER_BACKGROUND_MS, LOCK_AFTER_IDLE_MS } from '../src/services/security/appLock';

test('returning after more than 30 seconds away locks; the biometric sheet itself does not', () => {
  const left = lockDecision({ state: 'background', now: 1_000, backgroundAt: null, lastActive: 1_000 });
  assert.deepEqual(left, { lock: false, backgroundAt: 1_000 });
  assert.equal(lockDecision({ state: 'active', now: 1_000 + LOCK_AFTER_BACKGROUND_MS, backgroundAt: 1_000, lastActive: 1_000 }).lock, true);
  assert.equal(lockDecision({ state: 'active', now: 1_000 + 3_000, backgroundAt: 1_000, lastActive: 1_000 }).lock, false);
  // inactive → inactive keeps the first timestamp.
  assert.equal(lockDecision({ state: 'inactive', now: 5_000, backgroundAt: 1_000, lastActive: 1_000 }).backgroundAt, 1_000);
});

test('five idle minutes lock even without leaving the app', () => {
  assert.equal(lockDecision({ state: 'active', now: LOCK_AFTER_IDLE_MS, backgroundAt: null, lastActive: 0 }).lock, true);
  assert.equal(lockDecision({ state: 'active', now: LOCK_AFTER_IDLE_MS - 1, backgroundAt: null, lastActive: 0 }).lock, false);
});
