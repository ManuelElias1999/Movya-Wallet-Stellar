import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createChatHistoryStore, validChatHistory, type ChatHistoryMessage } from '../src/services/chatHistory';

test('chat history is account-scoped, keeps compact receipts and can be cleared', async () => {
  const data = new Map<string, string>();
  const store = createChatHistoryStore({
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async key => { data.delete(key); },
  });
  const messages: ChatHistoryMessage[] = [
    { id: 1, role: 'user', kind: 'text', text: 'Envía 1 XLM a Aya' },
    { id: 2, role: 'movya', kind: 'receipt', title: 'Enviado', summary: '1 XLM a Aya', receiptHash: 'a'.repeat(64), details: [{ label: 'Monto', value: '1 XLM' }] },
  ];
  await store.write('owner-a', messages);
  assert.deepEqual(await store.read('owner-a'), messages);
  assert.deepEqual(await store.read('owner-b'), []);
  await store.clear('owner-a');
  assert.deepEqual(await store.read('owner-a'), []);
});

test('chat history rejects malformed or oversized fields instead of restoring them', () => {
  assert.deepEqual(validChatHistory([{ id: 1, role: 'movya', kind: 'text', text: 'a'.repeat(1_001) }, { id: 2, role: 'user', kind: 'voice', duration: -1 }]), []);
});
