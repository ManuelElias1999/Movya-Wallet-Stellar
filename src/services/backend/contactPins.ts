// Pinned contact destinations. A payment to a saved contact goes only to the
// address this device recorded and the person approved. Supabase (the contact
// row and the email directory) is consulted only to DETECT changes; a
// different answer stops the payment and is never applied automatically.
// No dependencies on Expo or Supabase so the rules can be tested directly.

// verifiedAt: when the person added or approved this address (ms since epoch).
export type PinnedAddress = { address: string; email?: string; verifiedAt?: number };
export type PinStore = {
  read: (owner: string, contactId: string) => Promise<PinnedAddress | null>;
  write: (owner: string, contactId: string, pin: PinnedAddress) => Promise<void>;
  remove: (owner: string, contactId: string) => Promise<void>;
};
export type PinnableContact = { id: string; name: string; email?: string; address?: string };

export type ContactPinPrompt =
  | { kind: 'unverified'; contactId: string; contactName: string; address: string }
  | { kind: 'changed'; contactId: string; contactName: string; saved: string; current: string; source: 'contact' | 'directory' };

// Thrown instead of returning an address when the person must decide.
export class ContactPinRequired extends Error {
  readonly pinPrompt: ContactPinPrompt;
  constructor(prompt: ContactPinPrompt) {
    super(prompt.kind === 'unverified'
      ? `Confirma la dirección de ${prompt.contactName} antes del primer envío desde este dispositivo.`
      : `La dirección de ${prompt.contactName} cambió. Revisa el cambio antes de enviar.`);
    this.name = 'ContactPinRequired';
    this.pinPrompt = prompt;
  }
}
export function contactPinPrompt(error: unknown): ContactPinPrompt | null {
  const prompt = (error as { pinPrompt?: ContactPinPrompt } | null)?.pinPrompt;
  return prompt && (prompt.kind === 'unverified' || prompt.kind === 'changed') ? prompt : null;
}

export function createContactPins(deps: {
  store: PinStore;
  owner: () => Promise<string | null>;
  validate: (address: string) => void;
  // Exact verified-email lookup. Used only to detect a change.
  lookup: (email: string) => Promise<string | null>;
}) {
  const requireOwner = async () => {
    const owner = await deps.owner();
    if (!owner) throw new Error('Ingresa con tu correo para usar tus contactos guardados.');
    return owner;
  };
  const stillOwner = async (owner: string) => {
    if (await deps.owner() !== owner) throw new Error('La sesión cambió. Revisa el envío nuevamente.');
  };
  const readPin = async (owner: string, contactId: string) => {
    const pin = await deps.store.read(owner, contactId);
    if (!pin) return null;
    // A malformed local record is treated as missing: the person confirms again.
    try { deps.validate(pin.address); return pin; } catch { return null; }
  };

  return {
    // Record the address the person just added or explicitly approved.
    async pin(contact: PinnableContact, address = contact.address) {
      if (!address) throw new Error('Este contacto no tiene una dirección Stellar.');
      deps.validate(address);
      const owner = await requireOwner();
      await deps.store.write(owner, contact.id, { address, ...(contact.email ? { email: contact.email } : {}), verifiedAt: Date.now() });
      await stillOwner(owner);
    },
    async unpin(contactId: string) {
      const owner = await deps.owner();
      if (owner) await deps.store.remove(owner, contactId);
    },
    // The only address a payment to this contact may use.
    async destination(contact: PinnableContact): Promise<string> {
      const owner = await requireOwner();
      if (!contact.address) throw new Error('Este contacto no tiene una dirección Stellar.');
      deps.validate(contact.address);
      const pin = await readPin(owner, contact.id);
      if (!pin) throw new ContactPinRequired({ kind: 'unverified', contactId: contact.id, contactName: contact.name, address: contact.address });
      if (pin.address !== contact.address) {
        throw new ContactPinRequired({ kind: 'changed', contactId: contact.id, contactName: contact.name, saved: pin.address, current: contact.address, source: 'contact' });
      }
      if (contact.email) {
        // Detection only. If the directory is unreachable or the person no
        // longer has a verified wallet, the pinned address is still the one
        // they approved, so the payment can continue to it.
        let current: string | null = null;
        try { current = await deps.lookup(contact.email); } catch { current = null; }
        if (current && current !== pin.address) {
          try { deps.validate(current); } catch { current = null; }
          if (current) throw new ContactPinRequired({ kind: 'changed', contactId: contact.id, contactName: contact.name, saved: pin.address, current, source: 'directory' });
        }
      }
      await stillOwner(owner);
      return pin.address;
    },
  };
}
