import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseAiIntent, sanitizeAiHistory } from '../src/services/aiIntent';

test('AI send intent accepts only explicit supported transaction fields', () => {
  const intent = parseAiIntent({ kind: 'send', amount: '5', token: 'USDC', from: null, to: null, recipient: 'María', reply: null }, 'Mándale cinco USDC a María');
  assert.deepEqual(intent, { kind: 'send', amount: '5', token: 'USDC', from: null, to: null, recipient: 'María', reply: null });
  assert.throws(() => parseAiIntent({ ...intent, recipient: 'Carlos' }, 'Mándale cinco USDC a María'), /no escribiste/);
  assert.throws(() => parseAiIntent({ ...intent, token: 'BTC' }, 'Mándale cinco BTC a María'), /activo no permitido/);
  assert.throws(() => parseAiIntent({ ...intent, amount: '-5' }, 'Mándale menos cinco USDC a María'), /monto no válido/);
});

test('AI cannot reuse an old recipient when the newest message names another contact', () => {
  const followUp = { kind: 'send', amount: '1', token: 'USDC', from: null, to: null, recipient: 'Pruebita', reply: null };
  assert.deepEqual(parseAiIntent(followUp, 'Y a Pruebita también'), followUp);
  assert.throws(() => parseAiIntent({ ...followUp, recipient: 'Aya' }, 'Y a Pruebita también'), /no escribiste/);
});

test('AI swap intent must use two different supported assets and a valid amount', () => {
  assert.deepEqual(parseAiIntent({ kind: 'swap', amount: '1.2345678', token: null, from: 'XLM', to: 'USDC', recipient: null, reply: null }, 'Cambia 1.2345678 XLM por USDC'), {
    kind: 'swap', amount: '1.2345678', token: null, from: 'XLM', to: 'USDC', recipient: null, reply: null,
  });
  assert.throws(() => parseAiIntent({ kind: 'swap', amount: '1', token: null, from: 'XLM', to: 'XLM', recipient: null, reply: null }, 'Cambia 1 XLM por XLM'), /cambio no válido/);
});

test('non-transactional AI replies cannot smuggle transaction fields', () => {
  const intent = parseAiIntent({ kind: 'help', amount: '500', token: 'USDC', from: null, to: null, recipient: 'Carlos', reply: 'Puedo ayudarte con tu wallet.' }, 'Ayuda');
  assert.deepEqual(intent, { kind: 'help', amount: null, token: null, from: null, to: null, recipient: null, reply: 'Puedo ayudarte con tu wallet.' });
});

test('AI history is bounded and strips empty or malformed entries', () => {
  const history = Array.from({ length: 10 }, (_, index) => ({ role: index % 2 ? 'assistant' as const : 'user' as const, content: ` mensaje ${index} ` }));
  assert.deepEqual(sanitizeAiHistory(history).map(item => item.content), history.slice(-8).map(item => item.content.trim()));
  assert.deepEqual(sanitizeAiHistory([{ role: 'user', content: '   ' }]), []);
});
