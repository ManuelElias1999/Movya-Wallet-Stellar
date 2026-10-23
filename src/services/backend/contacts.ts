import { requireBackend } from './client';
import { validateAddress } from '../stellar/payments';
import { createContactPins } from './contactPins';
import { contactPinStore } from './contactPinStore';
import { contactVaultFor } from './contactBackup';
import type { ContactMap } from './contactVault';

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
  const contact = presentContact(result.data as Row);
  // Pin the address resolved here, not whatever the server echoes back. A
  // different echo is caught as a change before the first payment.
  await pins.pin(contact, address);
  void syncContactBackup().catch(() => undefined);
  return contact;
}
export async function updateContact(id: string, patch: { name?: string; favorite?: boolean }) {
  const result = await requireBackend().from('contacts').update(patch).eq('id', id).select('id,name,email,address,favorite').single();
  if (result.error) throw result.error;
  void syncContactBackup().catch(() => undefined);
  return presentContact(result.data as Row);
}
export async function deleteContact(id: string) {
  const result = await requireBackend().from('contacts').delete().eq('id', id).select('id').single();
  if (result.error) throw result.error;
  await pins.unpin(id).catch(() => undefined);
  void syncContactBackup().catch(() => undefined);
}

const pins = createContactPins({
  store: contactPinStore,
  owner: async () => (await requireBackend().auth.getSession()).data.session?.user.id ?? null,
  validate: validateAddress,
  lookup: async email => {
    const result = await requireBackend().rpc('resolve_movya_email', { contact_email: email.trim().toLowerCase() });
    if (result.error) throw result.error;
    return (result.data as string | null) ?? null;
  },
});
// The only address a payment to a saved contact may use. Throws
// ContactPinRequired when the person must confirm a first use on this device
// or a changed address; it never switches addresses on its own.
export function contactDestination(contact: Contact) {
  return pins.destination(contact);
}
// Called only after the person explicitly approved `address` for this contact.
export async function acceptContactAddress(contact: Contact, address: string) {
  validateAddress(address);
  let next = contact;
  if (contact.address !== address) {
    const result = await requireBackend().from('contacts').update({ address }).eq('id', contact.id).select('id,name,email,address,favorite').single();
    if (result.error?.code === '23505') throw new Error('Esa dirección ya pertenece a otro de tus contactos.');
    if (result.error) throw result.error;
    next = presentContact(result.data as Row);
    if (next.address !== address) throw new Error('No pudimos guardar la dirección aprobada. Vuelve a intentarlo.');
  }
  await pins.pin(next, address);
  void syncContactBackup().catch(() => undefined);
  return next;
}

const currentOwner = async () => (await requireBackend().auth.getSession()).data.session?.user.id ?? null;
// Returns only the address this device previously verified (or restored from
// the encrypted contact backup). A server-side contact-row change is never
// exposed as if it were trusted.
export async function verifiedContactAddress(contact: Contact) {
  const owner = await currentOwner();
  if (!owner) throw new Error('Ingresa para consultar la dirección verificada.');
  const pin = await contactPinStore.read(owner, contact.id);
  if (!pin) throw new Error('Esta dirección aún no está verificada en este dispositivo. Abre el contacto y verifícala primero.');
  validateAddress(pin.address);
  return pin.address;
}
// Saves the verified addresses (not the server's copy of them) in the
// encrypted contact backup.
export async function syncContactBackup() {
  const owner = await currentOwner();
  const vault = owner ? await contactVaultFor(owner) : null;
  if (!owner || !vault) return;
  const entries: ContactMap = {};
  for (const contact of await listContacts()) {
    const pin = await contactPinStore.read(owner, contact.id);
    if (pin) entries[contact.id] = { name: contact.name, address: pin.address, ...(contact.email ? { email: contact.email } : {}), ...(pin.verifiedAt ? { verifiedAt: pin.verifiedAt } : {}) };
  }
  await vault.save(entries);
}
// On a new device: contacts verified elsewhere are restored from the
// encrypted backup instead of being trusted from the contact rows.
export async function restorePinsFromBackup(contacts: Contact[]) {
  const owner = await currentOwner();
  const vault = owner ? await contactVaultFor(owner) : null;
  if (!owner || !vault) return 0;
  const backup = await vault.load();
  let restored = 0;
  for (const contact of contacts) {
    const entry = backup[contact.id];
    if (!entry || await contactPinStore.read(owner, contact.id)) continue;
    validateAddress(entry.address);
    await contactPinStore.write(owner, contact.id, { address: entry.address, ...(entry.email ? { email: entry.email } : {}), ...(entry.verifiedAt ? { verifiedAt: entry.verifiedAt } : {}) });
    restored++;
  }
  return restored;
}
