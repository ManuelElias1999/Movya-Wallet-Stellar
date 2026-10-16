import { strict as assert } from 'node:assert';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createElement, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { commits } from './fixtures/nativeTextInput';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
registerHooks({ resolve(specifier, context, nextResolve) {
  const fixtures: Record<string, string> = { 'react-native': './fixtures/nativeTextInput.tsx', 'expo-secure-store': './fixtures/secureStore.ts' };
  return nextResolve(fixtures[specifier] ? require.resolve(fixtures[specifier]) : specifier, context);
} });
const { PasswordInput }: typeof import('../src/components/PasswordInput') = require('../src/components/PasswordInput');
const { languageStore } = require('../src/i18n/Language');
const { Text }: typeof import('../src/i18n/primitives') = require('../src/i18n/primitives');

test('focus never clears or rewrites the password; deletion, append and language changes preserve the draft', async () => {
  commits.length = 0;
  const edits: string[] = [];
  function Form() {
    const [value, setValue] = useState('1235');
    return createElement(PasswordInput, { value, placeholder: 'Contraseña', secureTextEntry: true, onChangeText: next => { edits.push(next); setValue(next); } });
  }
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(Form)); });
  const field = () => tree.root.findByType('NativeTextInput' as any);
  assert.equal(field().props.onFocus, undefined);
  assert.equal(field().props.onKeyPress, undefined);
  assert.equal(field().props.clearTextOnFocus, false);
  await act(() => field().props.onChangeText('123'));
  await act(() => languageStore.set('en'));
  assert.equal(field().props.value, '123');
  assert.equal(field().props.placeholder, 'Password');
  await act(() => field().props.onChangeText('1234'));
  await act(() => field().props.onChangeText('123456'));
  assert.deepEqual(edits, ['123', '1234', '123456']);
  assert.ok(commits.every(commit => commit.secure && commit.value !== ''));
  await act(() => languageStore.set('es'));
  assert.equal(field().props.placeholder, 'Contraseña');
  assert.equal(field().props.value, '123456');
  await act(() => tree.unmount());
});

test('UI text switches live, while user content and recovery words remain verbatim', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement('Root', null,
    createElement(Text, null, 'Ingresar'),
    createElement(Text, { translate: false }, 'Inicio'),
    createElement(Text, { translate: false }, 'a phrase key secret'),
  )); });
  await act(() => languageStore.set('en'));
  assert.deepEqual(tree.root.findAllByType('NativeText' as any).map(node => node.props.children), ['Sign in', 'Inicio', 'a phrase key secret']);
  await act(() => languageStore.set('es'));
  assert.equal(tree.root.findAllByType('NativeText' as any)[0].props.children, 'Ingresar');
  await act(() => tree.unmount());
});
