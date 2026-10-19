// Encrypted backup of verified contact addresses, separate from the wallet
// backup, so a new device can restore pins without trusting Supabase.
// Rollback protection is partial: a device that saw version N refuses older
// or altered versions, but a brand-new device can only trust what it gets.
// Pure core: crypto and storage are injected.
export type ContactEntry = { name: string; email?: string; address: string; verifiedAt?: number };
export type ContactMap = Record<string, ContactEntry>;
export type SealedBackup = { nonce: string; ciphertext: string };
export type RemoteContactBackup = { version: number; backup: SealedBackup } | null;
export type KnownVersion = { version: number; hash: string };
export type ContactVaultDeps = {
  fetch: () => Promise<RemoteContactBackup>;
  put: (version: number, backup: SealedBackup) => Promise<void>;
  readKnown: () => Promise<KnownVersion | null>;
  writeKnown: (known: KnownVersion) => Promise<void>;
  seal: (plaintext: string, aad: string) => SealedBackup;
  open: (backup: SealedBackup, aad: string) => string;
  hash: (value: string) => string;
  now: () => number;
};
export class ContactBackupRollbackError extends Error {
  constructor() { super('La copia de tus contactos en el servidor es más antigua o distinta de la que ya conocía este teléfono. No la usaremos.'); this.name = 'ContactBackupRollbackError'; }
}
type Payload = { format: 1; version: number; savedAt: number; previousHash: string; contacts: ContactMap };

export function createContactVault(owner: string, deps: ContactVaultDeps) {
  const aad = (version: number) => `movya:contacts:${owner}:${version}`;
  async function checked() {
    const [remote, known] = await Promise.all([deps.fetch(), deps.readKnown()]);
    if (known && known.version > 0) {
      if (!remote || remote.version < known.version) throw new ContactBackupRollbackError();
      if (remote.version === known.version && deps.hash(remote.backup.ciphertext) !== known.hash) throw new ContactBackupRollbackError();
    }
    return remote;
  }
  return {
    async load(): Promise<ContactMap> {
      const remote = await checked();
      if (!remote) return {};
      const payload = JSON.parse(deps.open(remote.backup, aad(remote.version))) as Payload;
      if (payload.format !== 1 || payload.version !== remote.version || typeof payload.contacts !== 'object' || !payload.contacts) throw new Error('La copia de tus contactos no es válida.');
      await deps.writeKnown({ version: remote.version, hash: deps.hash(remote.backup.ciphertext) });
      return payload.contacts;
    },
    async save(contacts: ContactMap) {
      const remote = await checked();
      const version = (remote?.version ?? 0) + 1;
      const payload: Payload = { format: 1, version, savedAt: deps.now(), previousHash: remote ? deps.hash(remote.backup.ciphertext) : '', contacts };
      const sealed = deps.seal(JSON.stringify(payload), aad(version));
      await deps.put(version, sealed);
      await deps.writeKnown({ version, hash: deps.hash(sealed.ciphertext) });
      return version;
    },
  };
}
