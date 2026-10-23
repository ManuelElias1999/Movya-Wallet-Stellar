import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createLanguageStore, translateText, isLanguage } from '../src/i18n/core';
import english from '../src/i18n/en.json';
import { chatTopic, isChainedTransactionRequest, parseContactChatRequest, parseSendRequest } from '../src/services/chatIntent';
import { formatXlmBalance } from '../src/services/presentation';
test('all English copy interpolates correctly and Spanish stays original', () => {
  for (const [source, result] of Object.entries(english)) {
    const values = ['Aya López', '123.4567'];
    const fill = (text: string) => text.replace(/\{(\d+)\}/g, (_, index) => values[Number(index)]);
    assert.equal(translateText(fill(source), 'en'), fill(result), source);
    assert.equal(translateText(fill(source), 'es'), fill(source), source);
  }
  assert.equal(translateText('Unknown provider error', 'en'), 'Unknown provider error');
  assert.equal(translateText(' Hola, ', 'en'), ' Hi, ');
  assert.equal(translateText('Recibiste dinero de Aya López', 'en'), 'You received money from Aya López');
  assert.equal(translateText('Escribe el código que enviamos a aya@example.com.', 'en'), 'Enter the code we sent to aya@example.com.');
  assert.equal(translateText('Pedir fondos en USDC', 'en'), 'Request USDC funds');
});
test('language persists across sessions and a late read cannot undo a new selection', async () => {
  let saved: unknown = 'en';
  const storage = { read: async () => saved, write: async (next: string) => { saved = next; } };
  const first = createLanguageStore(storage);
  await first.hydrate(); assert.equal(first.get(), 'en');
  first.set('es'); await first.settled(); assert.equal(saved, 'es');
  const reopened = createLanguageStore(storage); await reopened.hydrate(); assert.equal(reopened.get(), 'es');
  let finish!: (value: unknown) => void;
  const late = createLanguageStore({ read: () => new Promise(resolve => { finish = resolve; }), write: async () => {} });
  const reading = late.hydrate(); late.set('en'); finish('es'); await reading; assert.equal(late.get(), 'en');
  assert.equal(isLanguage('fr'), false);
});
test('rapid changes persist in order and storage failures leave the language selector usable', async () => {
  const writes: string[] = []; let fail = true;
  const store = createLanguageStore({ read: async () => { throw Error('unavailable'); }, write: async next => { if (fail) { fail = false; throw Error('unavailable'); } writes.push(next); } });
  await store.hydrate(); assert.equal(store.get(), 'es');
  store.set('en'); store.set('es'); store.set('en'); await store.settled();
  assert.equal(store.get(), 'en'); assert.deepEqual(writes, ['es', 'en']);
});
test('both languages prepare equivalent chat requests without changing recipient names or precision', () => {
  assert.deepEqual(parseSendRequest('Send 1.2345678 XLM to Aya López'), parseSendRequest('Envía 1,2345678 XLM a Aya López'));
  assert.deepEqual(parseSendRequest('send 20 USDC to Inicio'), { amount: '20', token: 'USDC', recipient: 'Inicio' });
  assert.equal(parseSendRequest('send everything'), null);
  for (const pair of [['¿Cuánto dinero tengo?', 'How much money do I have?'], ['Cambia 50 XLM a USDC', 'Swap 50 XLM for USDC'], ['Agregar contacto', 'Add contact'], ['Quiero recibir', 'I want to receive']]) assert.equal(chatTopic(pair[0]), chatTopic(pair[1]));
  assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: '1234.1234567' }], 'en-US'), '1,234.1234567 XLM');
  assert.equal(formatXlmBalance([{ assetCode: 'XLM', balance: '1234.1234567' }], 'es-BO'), '1.234,1234567 XLM');
});

test('chat recognizes activity, contact queries and chained transactions without guessing', () => {
  assert.equal(chatTopic('Dime mis últimas 5 operaciones'), 'activity');
  assert.deepEqual(parseContactChatRequest('¿Cuántos contactos tengo?'), { kind: 'count' });
  assert.deepEqual(parseContactChatRequest('¿Cuál es el Address de Aya?'), { kind: 'address', name: 'Aya' });
  assert.deepEqual(parseContactChatRequest('Quiero agregar un nuevo contacto, se llama Nico'), { kind: 'add', name: 'Nico' });
  assert.equal(isChainedTransactionRequest('Cambia 1 USDC a XLM y después envía ese monto a Aya'), true);
  assert.equal(isChainedTransactionRequest('Cambia 1 USDC a XLM'), false);
});
