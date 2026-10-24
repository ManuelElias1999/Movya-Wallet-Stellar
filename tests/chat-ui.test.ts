import { strict as assert } from 'node:assert';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { calls } from './fixtures/chatRuntime';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
registerHooks({ resolve(specifier, context, nextResolve) {
  const mocked = ['react-native', '@expo/vector-icons', 'expo-blur', 'expo-haptics', 'expo-linear-gradient', 'expo-status-bar', 'react-native-safe-area-context', '@/components/MovyaLogo', '@/i18n/primitives', '@/i18n/Language', '@/context/AuthContext', '@/context/ContactsContext', '@/context/TestnetWalletContext', './TestnetWalletContext', '@/services/stellar/payments', '@/services/stellar/activity', '@/services/backend/contacts', '@/services/backend/ai', '@/services/stellar/swaps', '@/services/chatHistory', '@/components/PageHeader', '@/components/PressableScale', '@/components/InternalScreenBackground', '@/components/MovyaContextHelp', '@/components/TokenIcon', '@/components/TokenSelector'];
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

test('a balance answer keeps the next-action suggestions visible', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, '¿Cuánto dinero tengo?');
  assert.ok(content(tree).includes('Solicita XLM desde Inicio'));
  assert.ok(content(tree).includes('Envía 1 USDC a Prueba'));
  assert.ok(content(tree).includes('Cambia 50 XLM a USDC'));
  await act(() => tree.unmount());
});

test('real chat stays open: saved email contact → inline review → Yes button → exact receipt', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => { calls.close++; } })); });
  assert.ok(content(tree).includes('¿Cuánto dinero tengo?'));
  await send(tree, 'Envia 1 USDC a Prueba');
  assert.equal(calls.close, 0);
  assert.deepEqual(calls.prepare, [{ source: 'GSENDER', destination: 'GPRUEBA', amount: '1', asset: 'USDC' }]);
  assert.deepEqual(calls.resolve, ['prueba']);
  assert.equal(calls.submit.length, 0);
  assert.ok(content(tree).includes('Revisa tu transferencia'));
  assert.ok(!content(tree).includes('¿Cuánto dinero tengo?'));
  assert.ok(content(tree).includes('GPRUEBA'));
  await act(async () => button(tree, 'Sí, confirmar').props.onPress());
  assert.equal(calls.close, 0);
  assert.equal(calls.submit.length, 1);
  assert.ok(content(tree).includes('Enviado'));
  assert.ok(content(tree).includes('¿Cuánto dinero tengo?'));
  assert.ok(content(tree).includes('Ver detalles'));
  assert.ok(!content(tree).includes('a'.repeat(64)));
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

test('natural language uses AI only to prepare the same review flow', async () => {
  let tree!: ReactTestRenderer;
  const before = calls.submit.length;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, 'Mándale cinco USDC a Prueba');
  assert.equal(calls.ai.at(-1), 'Mándale cinco USDC a Prueba');
  assert.deepEqual(calls.prepare.at(-1), { source: 'GSENDER', destination: 'GPRUEBA', amount: '5', asset: 'USDC' });
  assert.equal(calls.submit.length, before);
  assert.ok(content(tree).includes('Revisa tu transferencia'));
  await act(() => tree.unmount());
});

test('a new message cannot make an earlier pending recipient look like a new order', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, 'Envia 1 USDC a Prueba');
  await send(tree, 'Y a Pruebita también');
  assert.ok(content(tree).includes('Ya tienes una orden pendiente de 1 USDC para Prueba'));
  assert.ok(content(tree).includes('Confírmala o cancélala antes de preparar otra orden'));
  assert.equal(calls.prepare.at(-1)?.destination, 'GPRUEBA');
  await act(() => tree.unmount());
});

test('contact count, address lookup and conversational contact creation use saved data', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, '¿Cuántos contactos tengo?');
  assert.ok(content(tree).includes('Tienes 2 contactos guardados'));
  await send(tree, 'How many contacts do I have?');
  assert.ok(content(tree).includes('Tienes 2 contactos guardados'));
  await send(tree, 'Dime todos mis contactos');
  assert.ok(content(tree).includes('Tus contactos son: Prueba, Aya'));
  await send(tree, '¿Cuál es el Address de Prueba?');
  assert.ok(content(tree).includes('GPRUEBA'));
  await send(tree, 'Quiero agregar un nuevo contacto, se llama Nico');
  assert.ok(content(tree).includes('correo de Movya o la dirección Stellar pública de Nico'));
  await send(tree, 'nico@example.com');
  assert.deepEqual(calls.contactAdds.at(-1), { name: 'Nico', identifier: 'nico@example.com', type: 'email' });
  assert.ok(content(tree).includes('guardé a Nico'));
  await act(() => tree.unmount());
});

test('activity is shown in chat and chained transactions are split into reviewed steps', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, 'Dime mis últimas 5 operaciones');
  assert.ok(content(tree).includes('Tus últimas 1 operaciones'));
  assert.ok(content(tree).includes('Enviaste dinero a Prueba'));
  await send(tree, 'Las últimas 2');
  assert.ok(content(tree).includes('Tus últimas 1 operaciones'));
  await send(tree, 'Tell me the last 4 movements that I did');
  assert.ok(content(tree).includes('Tus últimas 1 operaciones'));
  await act(() => tree.unmount());
});

test('a chained swap prepares the exact received amount for a separately confirmed payment', async () => {
  let tree!: ReactTestRenderer;
  const paymentsBefore = calls.submit.length;
  const swapsBefore = calls.swapSubmits.length;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, 'Quiero agregar un contacto que se llama Nico');
  await send(tree, 'Quiero cambiar 1 USDC a XLM y mandarle después ese monto a Aya');
  assert.ok(content(tree).includes('Revisa tu cambio'));
  assert.equal(calls.swapSubmits.length, swapsBefore);
  await act(async () => button(tree, 'Sí, cambiar').props.onPress());
  await act(async () => { await Promise.resolve(); });
  assert.equal(calls.swapSubmits.length, swapsBefore + 1);
  assert.deepEqual(calls.prepare.at(-1), { source: 'GSENDER', destination: 'GAYA', amount: '44.1234567', asset: 'XLM' });
  assert.equal(calls.submit.length, paymentsBefore);
  assert.ok(content(tree).includes('Cambio realizado'));
  assert.ok(content(tree).includes('44.1234567 XLM a Aya'));
  assert.ok(content(tree).includes('Revisa tu transferencia'));
  await act(async () => button(tree, 'Sí, confirmar').props.onPress());
  assert.equal(calls.submit.length, paymentsBefore + 1);
  await send(tree, 'Dime todos mis contactos');
  assert.ok(content(tree).includes('Tus contactos son: Prueba, Aya'));
  assert.ok(content(tree).includes('Ver detalles'));
  assert.ok(content(tree).includes('Enviado'));
  await act(() => tree.unmount());
});

test('the header can clear the saved conversation without touching wallet activity', async () => {
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); await Promise.resolve(); });
  await send(tree, 'Dime todos mis contactos');
  assert.ok(content(tree).includes('Tus contactos son: Prueba, Aya'));
  const clear = buttons(tree).find(item => item.props.accessibilityLabel === 'Vaciar conversación')!;
  await act(() => clear.props.onPress());
  const actions = calls.alerts.at(-1)?.[2];
  await act(async () => { actions.find((action: any) => action.text === 'Vaciar chat').onPress(); await Promise.resolve(); });
  assert.ok(!content(tree).includes('Tus contactos son: Prueba, Aya'));
  assert.equal(calls.historyClears.at(-1), 'owner');
  await act(() => tree.unmount());
});

test('successful payment details start collapsed and can be expanded and collapsed again', async () => {
  let tree!: ReactTestRenderer;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => {} })); });
  await send(tree, 'Envia 1 USDC a Prueba');
  await act(async () => button(tree, 'Sí, confirmar').props.onPress());
  assert.ok(content(tree).includes('Enviado'));
  assert.ok(content(tree).includes('Ver detalles'));
  assert.ok(!content(tree).includes('Hash de transacción'));
  await act(() => button(tree, 'Ver detalles').props.onPress());
  assert.ok(content(tree).includes('Hash de transacción'));
  assert.ok(content(tree).includes('Ocultar detalles'));
  await act(() => button(tree, 'Ocultar detalles').props.onPress());
  assert.ok(!content(tree).includes('Hash de transacción'));
  await act(() => tree.unmount());
});


test('Cambia 50 XLM a USDC quotes in chat and only the explicit swap confirmation executes', async () => {
  let tree!: ReactTestRenderer;
  const before = calls.swapSubmits.length;
  await act(() => { tree = create(createElement(MovyaChatSheet, { open: true, onClose: () => { calls.close++; } })); });
  await send(tree, 'Cambia 50 XLM a USDC');
  assert.deepEqual(calls.swaps.at(-1), { source: 'GSENDER', amount: '50', from: 'XLM', to: 'USDC' });
  assert.equal(calls.swapSubmits.length, before);
  assert.ok(!content(tree).includes('¿Cuánto dinero tengo?'));
  assert.ok(content(tree).includes('44.00'));
  assert.ok(!content(tree).includes('Mínimo que recibirás'));
  assert.ok(!content(tree).includes('Claro. Dime qué activo'));
  await act(async () => button(tree, 'Sí, cambiar').props.onPress());
  assert.equal(calls.swapSubmits.length, before + 1);
  assert.ok(content(tree).includes('Cambio realizado'));
  assert.ok(content(tree).includes('Ver detalles'));
  assert.ok(!content(tree).includes('b'.repeat(64)));
  await act(() => button(tree, 'Ver detalles').props.onPress());
  assert.ok(content(tree).includes('b'.repeat(64)));
  await act(() => button(tree, 'Ocultar detalles').props.onPress());
  assert.ok(!content(tree).includes('b'.repeat(64)));
  assert.ok(content(tree).includes('¿Cuánto dinero tengo?'));
  assert.equal(calls.close, 0);
  await act(() => tree.unmount());
});

test('Swap form auto-quotes, shows spendable funds, and MAX replaces the draft with the safe XLM amount', async () => {
  const { default: SwapScreen } = require('../app/(tabs)/swap');
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(createElement(SwapScreen)); });
  assert.ok(content(tree).includes('97.49999'));
  const input = () => tree.root.findByType('NativeTextInput' as any);
  await act(() => input().props.onChangeText('50'));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 450)); });
  assert.ok(content(tree).includes('44.00'));
  assert.ok(!content(tree).includes('Comisión de Movya'));
  const before = calls.swapSubmits.length;
  await act(() => button(tree, 'Revisar cambio').props.onPress());
  assert.ok(content(tree).includes('Comisión de Movya'));
  assert.ok(!content(tree).includes('Mínimo que recibirás'));
  assert.equal(calls.swapSubmits.length, before);
  const dismiss = buttons(tree).find(item => item.props.accessibilityLabel === 'Cerrar revisión')!;
  await act(() => dismiss.props.onPress());
  await act(() => button(tree, 'Máximo').props.onPress());
  assert.equal(input().props.value, '97.49999');
  assert.ok(!content(tree).includes('44.00'));
  await act(() => tree.unmount());
});
