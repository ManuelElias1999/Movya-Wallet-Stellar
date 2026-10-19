import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { contactPinPrompt, createContactPins, type PinnedAddress } from '../src/services/backend/contactPins';

const AYA = 'G' + 'A'.repeat(55);
const ATTACKER = 'G' + 'B'.repeat(55);
const NEW_AYA = 'G' + 'C'.repeat(55);
const validate = (address: string) => { if (!/^G[A-Z2-7]{55}$/.test(address)) throw new Error('invalid'); };

function setup(options: { owner?: string | null; directory?: Record<string, string | null>; lookupFails?: boolean } = {}) {
  const items = new Map<string, PinnedAddress>();
  let owner: string | null = options.owner === undefined ? 'alice' : options.owner;
  const directory = { ...(options.directory ?? {}) };
  const lookups: string[] = [];
  const pins = createContactPins({
    store: {
      read: async (o, id) => items.get(`${o}/${id}`) ?? null,
      write: async (o, id, pin) => { items.set(`${o}/${id}`, pin); },
      remove: async (o, id) => { items.delete(`${o}/${id}`); },
    },
    owner: async () => owner,
    validate,
    lookup: async email => { lookups.push(email); if (options.lookupFails) throw new Error('offline'); return directory[email] ?? null; },
  });
  return { pins, items, directory, lookups, setOwner: (next: string | null) => { owner = next; } };
}
const aya = { id: 'c1', name: 'Aya', email: 'aya@movya.test', address: AYA };

test('a pinned contact pays the pinned address even if Supabase now returns another one', async () => {
  const { pins, directory } = setup({ directory: { 'aya@movya.test': AYA } });
  await pins.pin(aya);
  assert.equal(await pins.destination(aya), AYA);
  // Compromised directory: the email now resolves to the attacker.
  directory['aya@movya.test'] = ATTACKER;
  const error = await pins.destination(aya).then(() => null, e => e);
  assert.deepEqual(contactPinPrompt(error), { kind: 'changed', contactId: 'c1', contactName: 'Aya', saved: AYA, current: ATTACKER, source: 'directory' });
});

test('a modified contact row in Supabase never becomes the destination silently', async () => {
  const { pins } = setup();
  await pins.pin(aya);
  const tampered = { ...aya, address: ATTACKER };
  const error = await pins.destination(tampered).then(() => null, e => e);
  assert.equal(contactPinPrompt(error)?.kind, 'changed');
  assert.equal((contactPinPrompt(error) as { saved: string }).saved, AYA);
});

test('an approved change is used afterwards; nothing changes before approval', async () => {
  const { pins, directory } = setup({ directory: { 'aya@movya.test': NEW_AYA } });
  await pins.pin(aya);
  await assert.rejects(pins.destination(aya));
  // The person confirmed with Aya; the app updates the row and the pin.
  const updated = { ...aya, address: NEW_AYA };
  await pins.pin(updated, NEW_AYA);
  assert.equal(await pins.destination(updated), NEW_AYA);
  directory['aya@movya.test'] = NEW_AYA;
  assert.equal(await pins.destination(updated), NEW_AYA);
});

test('a contact without a local pin (new device or older contact) requires confirmation', async () => {
  const { pins } = setup();
  const error = await pins.destination(aya).then(() => null, e => e);
  assert.deepEqual(contactPinPrompt(error), { kind: 'unverified', contactId: 'c1', contactName: 'Aya', address: AYA });
});

test('an unreachable directory or a missing entry does not block the pinned address', async () => {
  const offline = setup({ lookupFails: true });
  await offline.pins.pin(aya);
  assert.equal(await offline.pins.destination(aya), AYA);
  const missing = setup({ directory: { 'aya@movya.test': null } });
  await missing.pins.pin(aya);
  assert.equal(await missing.pins.destination(aya), AYA);
});

test('address-only contacts never query the directory', async () => {
  const { pins, lookups } = setup();
  const bob = { id: 'c2', name: 'Bob', address: AYA };
  await pins.pin(bob);
  assert.equal(await pins.destination(bob), AYA);
  assert.deepEqual(lookups, []);
});

test('pins are scoped to the account and a session switch aborts', async () => {
  const state = setup();
  await state.pins.pin(aya);
  state.setOwner('mallory');
  assert.equal(contactPinPrompt(await state.pins.destination(aya).then(() => null, e => e))?.kind, 'unverified');
  state.setOwner(null);
  await assert.rejects(state.pins.destination(aya), /Ingresa/);
});

test('a corrupted local pin is treated as unverified, never trusted', async () => {
  const { pins, items } = setup();
  items.set('alice/c1', { address: 'not-an-address' });
  assert.equal(contactPinPrompt(await pins.destination(aya).then(() => null, e => e))?.kind, 'unverified');
});

test('removing a contact removes its pin', async () => {
  const { pins, items } = setup();
  await pins.pin(aya);
  await pins.unpin('c1');
  assert.equal(items.size, 0);
});
