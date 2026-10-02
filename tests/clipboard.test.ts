import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createSensitiveClipboard } from '../src/services/sensitiveClipboard';

test('copies the full recovery value and expires it without erasing newer clipboard text', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let value = '';
  const copy = createSensitiveClipboard({ getStringAsync: async () => value, setStringAsync: async text => { value = text; return true; } });
  const phrase = 'one two three four five six seven eight nine ten eleven twelve';
  await copy(phrase, () => true); assert.equal(value, phrase);
  t.mock.timers.tick(60_000); await Promise.resolve(); await Promise.resolve();
  assert.equal(value, '');
  await copy('sample-private-key', () => true); value = 'a new note';
  t.mock.timers.tick(60_000); await Promise.resolve(); await Promise.resolve();
  assert.equal(value, 'a new note');
});

test('copying cannot outlive an account change or a hidden recovery screen', async () => {
  let active = true; let value = '';
  const copy = createSensitiveClipboard({ getStringAsync: async () => value, setStringAsync: async text => { value = text; active = false; return true; } });
  await assert.rejects(copy('sample-private-key', () => active), /se ocultó/);
  assert.equal(value, '');
  await assert.rejects(copy('sample-private-key', () => false), /Vuelve a mostrar/);
  assert.equal(value, '');
});
