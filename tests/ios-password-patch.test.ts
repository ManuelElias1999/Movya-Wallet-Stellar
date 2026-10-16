import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const { patch, before, after, patchField, fieldMethods } = require('../scripts/patch-ios-password.cjs');
test('secure iOS edits use the existing RN range replacement, cursor update and change notification', () => {
  const file = require.resolve('react-native/package.json').replace('package.json', 'Libraries/Text/TextInput/RCTBackedTextInputDelegateAdapter.mm');
  const original = readFileSync(file, 'utf8').replace(after, before);
  const updated = patch(original);
  assert.ok(updated.includes(after));
  assert.equal(updated.replace(after, before), original);
  assert.ok(updated.includes('[attributedString replaceCharactersInRange:range withString:newText]'));
  assert.ok(updated.includes('[self textFieldDidChange]'));
  assert.equal(patch(updated), updated);
  assert.throws(() => patch('unknown future RN adapter'), /Unsupported/);
});
test('native key input goes through the patched delegate and deletion respects composed characters', () => {
  const file = require.resolve('react-native/package.json').replace('package.json', 'Libraries/Text/TextInput/Singleline/RCTUITextField.mm');
  const original = readFileSync(file, 'utf8').replace(fieldMethods, '');
  const updated = patchField(original);
  assert.equal(updated.replace(fieldMethods, ''), original);
  assert.ok(updated.includes('rangeOfComposedCharacterSequenceAtIndex:start - 1'));
  assert.equal(patchField(updated), updated);
  assert.throws(() => patchField('unknown future field'), /Unsupported/);
});
