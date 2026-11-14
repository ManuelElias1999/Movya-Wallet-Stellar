import type { Contact } from '@/services/backend/contacts';
import { looksLikeStellarPublicKey, sanitizeStellarAddressInput } from '@/services/transferPresentation';

function normalizeContactText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function filterAndSortContacts(contacts: Contact[], search: string) {
  const query = normalizeContactText(search);
  return contacts
    .filter(contact => !query || normalizeContactText([
      contact.name,
      contact.handle,
      contact.email ?? '',
      contact.address ?? '',
    ].join(' ')).includes(query))
    .sort((left, right) => Number(right.favorite) - Number(left.favorite) || left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }));
}

export function contactAccountKind(contact: Pick<Contact, 'email'>) {
  return contact.email ? 'movya' : 'external';
}

export function sanitizeContactIdentifier(value: string, type: 'email' | 'address') {
  return type === 'address' ? sanitizeStellarAddressInput(value) : value.replace(/\s/g, '').toLowerCase();
}

export function isContactIdentifierReady(value: string, type: 'email' | 'address') {
  const identifier = sanitizeContactIdentifier(value, type);
  return type === 'address' ? looksLikeStellarPublicKey(identifier) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

export function isContactDraftReady(name: string, identifier: string, type: 'email' | 'address') {
  const trimmedName = name.trim();
  return trimmedName.length > 0 && trimmedName.length <= 80 && isContactIdentifierReady(identifier, type);
}
