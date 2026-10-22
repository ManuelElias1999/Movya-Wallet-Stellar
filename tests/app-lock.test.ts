import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { lockDecision, LOCK_AFTER_BACKGROUND_MS } from '../src/services/security/appLock';

test('returning after five minutes away locks; the biometric sheet itself does not', () => {
  const left = lockDecision({ state: 'background', now: 1_000, backgroundAt: null });
  assert.deepEqual(left, { lock: false, backgroundAt: 1_000 });
  assert.equal(lockDecision({ state: 'active', now: 1_000 + LOCK_AFTER_BACKGROUND_MS, backgroundAt: 1_000 }).lock, true);
  assert.equal(lockDecision({ state: 'active', now: 1_000 + LOCK_AFTER_BACKGROUND_MS - 1, backgroundAt: 1_000 }).lock, false);
  assert.equal(lockDecision({ state: 'inactive', now: 5_000, backgroundAt: null }).backgroundAt, null);
  assert.equal(lockDecision({ state: 'inactive', now: 5_000, backgroundAt: 1_000 }).backgroundAt, 1_000);
});

test('staying in the app does not lock merely because no screen was touched', () => {
  assert.equal(lockDecision({ state: 'active', now: 60 * 60_000, backgroundAt: null }).lock, false);
});
