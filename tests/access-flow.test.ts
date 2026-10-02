import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { accessSteps } from '../src/services/backend/accessFlow';

test('only account creation requests the guide; login never repeats it even on another device', () => {
  assert.deepEqual(accessSteps(true, false), { needsBackup: true, needsOnboarding: true });
  assert.deepEqual(accessSteps(true, true), { needsBackup: false, needsOnboarding: true });
  assert.deepEqual(accessSteps(false, false), { needsBackup: false, needsOnboarding: false });
  assert.deepEqual(accessSteps(false, true), { needsBackup: false, needsOnboarding: false });
});
