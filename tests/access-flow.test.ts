import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { accessSteps, accountAccessSteps } from '../src/services/backend/accessFlow';

test('only account creation requests the guide; login never repeats it even on another device', () => {
  assert.deepEqual(accessSteps(true, false), { needsBackup: true, needsOnboarding: true });
  assert.deepEqual(accessSteps(true, true), { needsBackup: false, needsOnboarding: true });
  assert.deepEqual(accessSteps(false, false), { needsBackup: false, needsOnboarding: false });
  assert.deepEqual(accessSteps(false, true), { needsBackup: false, needsOnboarding: false });
});

test('backup and onboarding state never leak from one account into another', () => {
  assert.deepEqual(accountAccessSteps({
    previousOwner: 'manuel', owner: 'friend', currentNeedsBackup: true, currentNeedsOnboarding: true,
    newAccount: false, backupAcknowledged: true,
  }), { needsBackup: false, needsOnboarding: false });
  assert.deepEqual(accountAccessSteps({
    previousOwner: 'manuel', owner: 'manuel', currentNeedsBackup: true, currentNeedsOnboarding: false,
    newAccount: false, backupAcknowledged: false,
  }), { needsBackup: true, needsOnboarding: false });
});
