import { strict as assert } from 'node:assert';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createElement, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { commits, Platform, selections } from './fixtures/nativeTextInput';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === 'react-native' ? require.resolve('./fixtures/nativeTextInput.tsx') : specifier, context);
  },
});
const { PasswordInput }: typeof import('../src/components/PasswordInput') = require('../src/components/PasswordInput');

test('iOS focus reassigns protected text before editing without changing the password or revealing it', async () => {
  commits.length = 0; selections.length = 0;
  const edits: string[] = [];
  function Form() {
    const [value, setValue] = useState('1235');
    return createElement(PasswordInput, { value, secureTextEntry: true, onChangeText: next => { edits.push(next); setValue(next); } });
  }
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(Form)); });
  const field = () => tree.root.findByType('NativeTextInput' as any);
  await act(() => field().props.onFocus({}));
  assert.deepEqual(commits.map(x => x.value), ['1235', '', '1235']);
  assert.deepEqual(edits, []);
  assert.ok(commits.every(x => x.secure));
  assert.deepEqual(selections.at(-1), [4, 4]);

  // Native edits now pass through; no post-key correction rewrites the field.
  await act(() => field().props.onChangeText('123'));
  assert.equal(field().props.value, '123');
  await act(() => field().props.onFocus({}));
  await act(() => field().props.onChangeText('1234'));
  assert.equal(field().props.value, '1234');
  await act(() => field().props.onFocus({}));
  await act(() => field().props.onChangeText('12345'));
  assert.deepEqual(edits, ['123', '1234', '12345']);
  assert.ok(commits.every(x => x.secure));
  assert.equal(field().props.onKeyPress, undefined);
  await act(() => tree.unmount());
});

test('visible, empty, Android and web fields do not refresh; paste and autofill pass through unchanged', async () => {
  for (const scenario of [{ os: 'ios', secure: false, value: '1234' }, { os: 'ios', secure: true, value: '' }, { os: 'android', secure: true, value: '1234' }, { os: 'web', secure: true, value: '1234' }]) {
    Platform.OS = scenario.os;
    commits.length = 0;
    const edits: string[] = [];
    let tree!: ReactTestRenderer;
    await act(() => { tree = create(createElement(PasswordInput, { value: scenario.value, secureTextEntry: scenario.secure, onChangeText: next => edits.push(next) })); });
    const field = tree.root.findByType('NativeTextInput' as any);
    await act(() => field.props.onFocus({}));
    assert.deepEqual(commits, [{ value: scenario.value, secure: scenario.secure }]);
    await act(() => field.props.onChangeText('pasted-or-autofilled-password'));
    assert.deepEqual(edits, ['pasted-or-autofilled-password']);
    await act(() => tree.unmount());
  }
  Platform.OS = 'ios';
});
