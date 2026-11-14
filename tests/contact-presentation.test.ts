import assert from 'node:assert/strict';
import test from 'node:test';

import { contactAccountKind, filterAndSortContacts, isContactDraftReady, isContactIdentifierReady, sanitizeContactIdentifier } from '../src/services/contactPresentation';
import type { Contact } from '../src/services/backend/contacts';

const contacts: Contact[] = [
  { id: '1', name: 'Ángela', email: 'angela@movya.test', address: `G${'A'.repeat(55)}`, favorite: false, handle: 'angela@movya.test', initials: 'Á', color: '#fff' },
  { id: '2', name: 'Zoe', address: `G${'B'.repeat(55)}`, favorite: true, handle: 'GBBBB…BBBB', initials: 'Z', color: '#fff' },
  { id: '3', name: 'Bruno', email: 'bruno@movya.test', address: `G${'C'.repeat(55)}`, favorite: false, handle: 'bruno@movya.test', initials: 'B', color: '#fff' },
];

test('contact search ignores accents and matches name, email, and full address', () => {
  assert.deepEqual(filterAndSortContacts(contacts, 'angela').map(contact => contact.id), ['1']);
  assert.deepEqual(filterAndSortContacts(contacts, 'BRUNO@MOVYA').map(contact => contact.id), ['3']);
  assert.deepEqual(filterAndSortContacts(contacts, `G${'B'.repeat(55)}`).map(contact => contact.id), ['2']);
});

test('favorites stay first and the remaining contacts are alphabetical', () => {
  assert.deepEqual(filterAndSortContacts(contacts, '').map(contact => contact.id), ['2', '1', '3']);
});

test('contact cards distinguish Movya accounts from external wallets', () => {
  assert.equal(contactAccountKind(contacts[0]), 'movya');
  assert.equal(contactAccountKind(contacts[1]), 'external');
});

test('new contact identifiers are normalized and validated before submission', () => {
  const address = `G${'A'.repeat(55)}`;
  assert.equal(sanitizeContactIdentifier(' MANU@EXAMPLE.COM ', 'email'), 'manu@example.com');
  assert.equal(sanitizeContactIdentifier(` ${address.toLowerCase()}\n`, 'address'), address);
  assert.equal(isContactIdentifierReady('manu@example.com', 'email'), true);
  assert.equal(isContactIdentifierReady('manu@', 'email'), false);
  assert.equal(isContactIdentifierReady(address, 'address'), true);
  assert.equal(isContactIdentifierReady('GABC', 'address'), false);
  assert.equal(isContactDraftReady('Manu', 'manu@example.com', 'email'), true);
  assert.equal(isContactDraftReady('   ', 'manu@example.com', 'email'), false);
});
