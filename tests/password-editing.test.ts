import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { recoverResumedPasswordEdit } from '../src/services/passwordEditing';

test('resuming a masked password appends the next character instead of replacing the draft', () => {
  assert.deepEqual(recoverResumedPasswordEdit('1234', '5', '5', { start: 4, end: 4 }), { value: '12345', cursor: 5 });
  assert.equal(recoverResumedPasswordEdit('1234', '12345', '5', { start: 4, end: 4 }), null);
});

test('backspace after refocusing removes one character, allowing the typo to be corrected', () => {
  const edit = recoverResumedPasswordEdit('1235', '', 'Backspace', { start: 4, end: 4 });
  assert.deepEqual(edit, { value: '123', cursor: 3 });
  assert.equal(edit!.value + '4', '1234');
  assert.equal(recoverResumedPasswordEdit('1235', '123', 'Backspace', { start: 4, end: 4 }), null);
});

test('recovery respects cursor positions, selected ranges, and deliberate select-all edits', () => {
  assert.deepEqual(recoverResumedPasswordEdit('1234', 'x', 'x', { start: 2, end: 2 }), { value: '12x34', cursor: 3 });
  assert.deepEqual(recoverResumedPasswordEdit('1234', '', 'Backspace', { start: 1, end: 3 }), { value: '14', cursor: 1 });
  assert.equal(recoverResumedPasswordEdit('1234', 'x', 'x', { start: 0, end: 4 }), null);
  assert.equal(recoverResumedPasswordEdit('1234', '', 'Backspace', { start: 0, end: 4 }), null);
});

test('new passwords, autofill replacements, and non-editing keys are left untouched', () => {
  assert.equal(recoverResumedPasswordEdit('', 'a', 'a', { start: 0, end: 0 }), null);
  assert.equal(recoverResumedPasswordEdit('1234', 'autofilled-password', 'a', { start: 4, end: 4 }), null);
  assert.equal(recoverResumedPasswordEdit('1234', '1234', 'Enter', { start: 4, end: 4 }), null);
  assert.equal(recoverResumedPasswordEdit('1234', '1234', 'ArrowLeft', { start: 4, end: 4 }), null);
});
