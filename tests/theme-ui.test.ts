import { strict as assert } from 'node:assert';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import { createElement, useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
registerHooks({ resolve(specifier, context, nextResolve) {
  const mocked = ['react-native', '@expo/vector-icons', '@/i18n/primitives', '@/components/PressableScale'];
  return nextResolve(mocked.includes(specifier) ? require.resolve('./fixtures/chatRuntime') : specifier, context);
} });
const { ThemeSelector }: typeof import('../src/components/ThemeSelector') = require('../src/components/ThemeSelector');
const { DashboardHeader }: typeof import('../src/components/DashboardHeader') = require('../src/components/DashboardHeader');
const { useTheme, themeStore }: typeof import('../src/theme/Theme') = require('../src/theme/Theme');
const { View, TextInput }: typeof import('./fixtures/chatRuntime') = require('./fixtures/chatRuntime');
const { lightColors, darkColors } = require('../src/theme/tokens');

test('theme selection repaints a mounted screen without losing its typed draft', async () => {
  function Probe() {
    const { colors } = useTheme(); const [draft, setDraft] = useState('');
    return createElement(View, { style: { backgroundColor: colors.background } }, createElement(TextInput, { value: draft, onChangeText: setDraft, style: { color: colors.ink } }), createElement(ThemeSelector));
  }
  let tree!: ReactTestRenderer;
  await act(() => { themeStore.set('dark'); tree = create(createElement(Probe)); });
  await act(() => tree.root.findByType('NativeTextInput' as any).props.onChangeText('unfinished draft'));
  const select = (label: string) => tree.root.findAllByType('NativePressable' as any).find(node => node.props.accessibilityLabel === label)!;
  await act(() => select('Modo claro').props.onPress());
  assert.equal(tree.root.findByType('NativeTextInput' as any).props.value, 'unfinished draft');
  assert.equal(tree.root.findByType('NativeTextInput' as any).props.style.color, lightColors.ink);
  assert.equal(select('Modo claro').props.accessibilityState.checked, true);
  await act(() => select('Modo oscuro').props.onPress());
  assert.equal(tree.root.findByType('NativeTextInput' as any).props.value, 'unfinished draft');
  assert.equal(tree.root.findByType('NativeTextInput' as any).props.style.color, darkColors.ink);
  await act(() => tree.unmount());
});

test('dashboard header is compact and keeps working settings and refresh actions', async () => {
  let tree!: ReactTestRenderer; let profile = 0, refresh = 0;
  await act(() => { tree = create(createElement(DashboardHeader, { name: 'Manuel Elias', loading: false, onProfile: () => { profile++; }, onRefresh: () => { refresh++; } })); });
  const button = (label: string) => tree.root.findAllByType('NativePressable' as any).find(node => node.props.accessibilityLabel === label)!;
  await act(() => button('Abrir ajustes').props.onPress());
  await act(() => button('Actualizar portafolio').props.onPress());
  assert.equal(profile, 1); assert.equal(refresh, 1);
  assert.equal(tree.root.findAllByType('NativeView' as any)[0].props.style.backgroundColor, darkColors.background);
  assert.ok(JSON.stringify(tree.toJSON()).includes('Hola,'));
  assert.ok(JSON.stringify(tree.toJSON()).includes('Un mensaje, una transacción'));
  assert.ok(!JSON.stringify(tree.toJSON()).includes('Activar modo claro'));
  await act(() => tree.unmount());
});

test('login has no hard-edged shine overlay and Stellar keeps a white badge in either theme', () => {
  const login = readFileSync(new URL('../app/index.tsx', import.meta.url), 'utf8');
  assert.ok(!login.includes('style={styles.cardShine}'));
  const card = readFileSync(new URL('../src/components/AnimatedAccountCard.tsx', import.meta.url), 'utf8');
  assert.match(card, /stellarPill: \{[^\n]*backgroundColor: '#FFFFFF'/);
});
