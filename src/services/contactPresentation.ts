import type { Contact } from '@/services/backend/contacts';

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
