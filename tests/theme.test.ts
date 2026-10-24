import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createThemeStore } from '../src/theme/preference';
import { darkColors, lightColors } from '../src/theme/tokens';

test('appearance restores the saved choice and rejects invalid preferences', async () => {
  const store = createThemeStore();
  await store.hydrate({ read: async () => 'light', write: async () => {} });
  assert.equal(store.get(), 'light');
  await store.hydrate({ read: async () => 'invalid', write: async () => {} });
  assert.equal(store.get(), 'light');
});

test('a late storage read cannot undo a new theme choice; rapid writes remain ordered', async () => {
  const store = createThemeStore(); const writes: string[] = [];
  let finish!: (value: string) => void;
  const hydration = store.hydrate({ read: () => new Promise(resolve => { finish = resolve; }), write: async mode => { writes.push(mode); } });
  store.set('light'); store.set('dark'); store.set('light');
  finish('dark'); await hydration; await store.flush();
  assert.equal(store.get(), 'light');
  assert.deepEqual(writes, ['light', 'dark', 'light']);
});

test('storage failure leaves appearance controls usable and never blocks startup', async () => {
  const store = createThemeStore(); let changes = 0;
  const stop = store.subscribe(() => changes++);
  await store.hydrate({ read: async () => { throw Error('unavailable'); }, write: async () => { throw Error('full'); } });
  store.set('light'); await store.flush(); store.set('dark'); await store.flush();
  assert.equal(store.get(), 'dark'); assert.equal(changes, 2); stop();
});

const luminance = (hex: string) => {
  const rgb = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
const contrast = (a: string, b: string) => { const values = [luminance(a), luminance(b)].sort((x, y) => y - x); return (values[0] + 0.05) / (values[1] + 0.05); };

test('both palettes keep primary and secondary copy readable on page and card surfaces', () => {
  for (const palette of [lightColors, darkColors]) {
    for (const background of [palette.background, palette.surface, palette.surfaceElevated]) {
      for (const text of [palette.ink, palette.text, palette.muted]) assert.ok(contrast(text, background) >= 4.5, `${text} on ${background}`);
    }
    assert.ok(contrast(palette.brandDark, palette.brandSoft) >= 4.5);
  }
});
