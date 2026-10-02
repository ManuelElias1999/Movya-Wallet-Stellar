import { requireBackend } from './client';
import { validateAddress } from '../stellar/payments';

export type Contact = { id: string; name: string; email?: string; address?: string; favorite: boolean; handle: string; initials: string; color: string };
type Row = { id: string; name: string; email: string | null; address: string; favorite: boolean };
export function presentContact(row: Row): Contact {
  return { ...row, email: row.email ?? undefined, initials: row.name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase(), color: row.email ? '#E4F3FF' : '#F0EBFF', handle: row.email ?? `${row.address.slice(0, 5)}…${row.address.slice(-4)}` };
}
export async function listContacts(): Promise<Contact[]> {
  const result = await requireBackend().from('contacts').select('id,name,email,address,favorite').order('created_at');
  if (result.error) throw result.error;
  return (result.data as Row[]).map(presentContact);
}
export async function resolveEmail(email: string) {
  const result = await requireBackend().rpc('resolve_movya_email', { contact_email: email.trim().toLowerCase() });
  if (result.error) throw result.error;
  if (!result.data) throw new Error('Ese correo todavía no tiene una wallet Movya verificada. Puedes guardar su dirección pública.');
  validateAddress(result.data as string);
  return result.data as string;
}
export async function addContact(input: { name: string; identifier: string; type: 'email' | 'address' }) {
  const name = input.name.trim(); const value = input.identifier.trim();
  if (!name || name.length > 80) throw new Error('Ingresa un nombre de hasta 80 caracteres.');
  const email = input.type === 'email' ? value.toLowerCase() : null;
  const address = email ? await resolveEmail(email) : value;
  validateAddress(address);
  const result = await requireBackend().from('contacts').insert({ name, email, address }).select('id,name,email,address,favorite').single();
  if (result.error?.code === '23505') throw new Error('Esa persona ya está en tus contactos.');
  if (result.error) throw result.error;
  return presentContact(result.data as Row);
}
export async function updateContact(id: string, patch: { name?: string; favorite?: boolean }) {
  const result = await requireBackend().from('contacts').update(patch).eq('id', id).select('id,name,email,address,favorite').single();
  if (result.error) throw result.error;
  return presentContact(result.data as Row);
}
export async function deleteContact(id: string) {
  const result = await requireBackend().from('contacts').delete().eq('id', id).select('id').single();
  if (result.error) throw result.error;
}
export async function contactDestination(contact: Contact) {
  const address = contact.email ? await resolveEmail(contact.email) : contact.address;
  if (!address) throw new Error('Este contacto no tiene una dirección Stellar.');
  validateAddress(address);
  return address;
}
