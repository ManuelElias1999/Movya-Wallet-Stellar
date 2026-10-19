import { strict as assert } from 'node:assert';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { calls } from './fixtures/chatRuntime';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
registerHooks({ resolve(specifier, context, nextResolve) {
  const mocked = ['react-native', '@expo/vector-icons', 'expo-blur', 'expo-haptics', 'expo-linear-gradient', 'expo-status-bar', 'react-native-safe-area-context', '@/components/MovyaLogo', '@/i18n/primitives', '@/i18n/Language', '@/context/AuthContext', '@/context/ContactsContext', '@/context/TestnetWalletContext', '@/services/stellar/payments', '@/services/backend/contacts'];
  return nextResolve(mocked.includes(specifier) ? require.resolve('./fixtures/chatRuntime') : specifier, context);
} });
const { MovyaChatSheet }: typeof import('../src/components/MovyaChatSheet') = require('../src/components/MovyaChatSheet');

const content = (tree: ReactTestRenderer) => JSON.stringify(tree.toJSON());
const buttons = (tree: ReactTestRenderer) => tree.root.findAllByType('NativePressable' as any);
const button = (tree: ReactTestRenderer, text: string) => buttons(tree).find(b => b.findAllByType('NativeText' as any).some(node => node.props.children === text))!;
async function send(tree: ReactTestRenderer, value: string) {
  await act(() => tree.root.findByType('NativeTextInput' as any).props.onChangeText(value));
  const composerSend = buttons(tree).find(b => b.findAllByType('Icon' as any).some(icon => icon.props.name === 'arrow-up'))!;
  await act(async () => { composerSend.props.onPress(); });
}

test('real chat stays open: saved email contact → inline review → Yes button → exact receipt', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => { calls.close++; } })); });
  await send(tree, 'Envia 1 USDC a Prueba');
  assert.equal(calls.close, 0);
  assert.deepEqual(calls.prepare, [{ source: 'GSENDER', destination: 'GPRUEBA', amount: '1', asset: 'USDC' }]);
  assert.deepEqual(calls.resolve, ['prueba']);
  assert.equal(calls.submit.length, 0);
  assert.ok(content(tree).includes('Revisa tu transferencia'));
  assert.ok(content(tree).includes('GPRUEBA'));
  await act(async () => button(tree, 'Sí, confirmar').props.onPress());
  assert.equal(calls.close, 0);
  assert.equal(calls.submit.length, 1);
  assert.ok(content(tree).includes('Transacción exitosa'));
  assert.ok(content(tree).includes('a'.repeat(64)));
  assert.ok(!content(tree).includes('Transacción demostrativa'));
  await act(() => tree.unmount());
});

test('English XLM request and typed cancellation/confirmation use the same inline flow', async () => {
  let tree!: ReactTestRenderer;
  const before = calls.submit.length;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => { calls.close++; } })); });
  await send(tree, 'Send 2 XLM to Prueba');
  await send(tree, 'No');
  assert.equal(calls.submit.length, before);
  assert.ok(content(tree).includes('Transacción cancelada'));
  await send(tree, 'Send 2 XLM to Prueba');
  await send(tree, 'Yes');
  assert.equal(calls.submit.length, before + 1);
  assert.equal(calls.submit.at(-1)?.asset, 'XLM');
  assert.equal(calls.close, 0);
  await act(() => tree.unmount());
});
