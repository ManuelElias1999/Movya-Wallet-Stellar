// Local wallet storage split in two items:
//  - metadata (account, signer public key, flags): readable without a prompt,
//    so the app can show balances and decide what to ask for;
//  - secret (signing key and recovery words): stored with system biometric
//    authentication whenever the device supports it, so every signature and
//    every reveal requires Face ID / Touch ID / fingerprint, even if the phone
//    itself is unlocked.
// Pure module with an injected key-value store so the rules are testable.

export type Protection = 'biometric' | 'none';
export type WalletMeta = {
  accountId: string; signerPublicKey: string; oualiAddress: string;
  backupAcknowledged?: boolean; backupFingerprint?: string; hasMnemonic: boolean; protection: Protection;
};
export type WalletSecret = { secret: string; mnemonic?: string };
export type StoredWallet = WalletSecret & {
  oualiAddress: string; backupAcknowledged?: boolean; backupFingerprint?: string;
  // Stellar account that holds the funds. Equal to the signer's public key
  // until the signing key is rotated (see stellar/signers.ts).
  accountId?: string;
};
export type KeyValue = {
  get: (key: string, protectedItem: boolean) => Promise<string | null>;
  set: (key: string, value: string, protectedItem: boolean) => Promise<void>;
  remove: (key: string) => Promise<void>;
  canProtect: () => boolean;
};

const metaKey = (userId?: string) => userId ? `movya.testnet.wallet.user.${userId}` : 'movya.testnet.wallet.v1';
const secretKey = (userId?: string) => `${metaKey(userId)}.secret`;

function parseMeta(raw: string): WalletMeta | (StoredWallet & { legacy: true }) {
  const value = JSON.parse(raw) as Record<string, unknown>;
  if (typeof value.secret === 'string') return { ...(value as StoredWallet), legacy: true };
  if (typeof value.accountId !== 'string' || typeof value.signerPublicKey !== 'string') throw new Error('Datos locales de la wallet inválidos.');
  return {
    accountId: value.accountId, signerPublicKey: value.signerPublicKey, oualiAddress: typeof value.oualiAddress === 'string' ? value.oualiAddress : '',
    hasMnemonic: value.hasMnemonic === true, protection: value.protection === 'biometric' ? 'biometric' : 'none',
    ...(typeof value.backupAcknowledged === 'boolean' ? { backupAcknowledged: value.backupAcknowledged } : {}),
    ...(typeof value.backupFingerprint === 'string' ? { backupFingerprint: value.backupFingerprint } : {}),
  };
}

export function createWalletStore(kv: KeyValue, signerOf: (secret: string) => string) {
  async function write(wallet: StoredWallet, userId?: string): Promise<WalletMeta> {
    const signerPublicKey = signerOf(wallet.secret);
    const protection: Protection = kv.canProtect() ? 'biometric' : 'none';
    const secret: WalletSecret = { secret: wallet.secret, ...(wallet.mnemonic ? { mnemonic: wallet.mnemonic } : {}) };
    // Secret first: metadata is only written once the key is safely stored.
    await kv.set(secretKey(userId), JSON.stringify(secret), protection === 'biometric');
    const meta: WalletMeta = {
      accountId: wallet.accountId ?? signerPublicKey, signerPublicKey, oualiAddress: wallet.oualiAddress ?? '',
      hasMnemonic: Boolean(wallet.mnemonic), protection,
      ...(wallet.backupAcknowledged !== undefined ? { backupAcknowledged: wallet.backupAcknowledged } : {}),
      ...(wallet.backupFingerprint ? { backupFingerprint: wallet.backupFingerprint } : {}),
    };
    await kv.set(metaKey(userId), JSON.stringify(meta), false);
    return meta;
  }
  async function readMeta(userId?: string): Promise<WalletMeta | null> {
    const raw = await kv.get(metaKey(userId), false);
    if (!raw) return null;
    const parsed = parseMeta(raw);
    // Wallets saved before this change kept the key in the metadata item.
    // Move it into the protected item, then drop it from the metadata.
    if ('legacy' in parsed) {
      const { legacy: _legacy, ...wallet } = parsed;
      return write(wallet, userId);
    }
    return parsed;
  }
  return {
    readMeta,
    write,
    // Updating an existing Face ID-protected Keychain item can show a prompt
    // on iOS. Password login has already decrypted and authenticated the
    // server backup, so replace the item instead of opening the old one.
    async replaceAfterPassword(wallet: StoredWallet, userId?: string) {
      await kv.remove(secretKey(userId));
      return write(wallet, userId);
    },
    // Reading the secret shows the system biometric prompt when protected.
    async readFull(userId?: string): Promise<StoredWallet | null> {
      const meta = await readMeta(userId);
      if (!meta) return null;
      const raw = await kv.get(secretKey(userId), meta.protection === 'biometric');
      if (!raw) return null;
      const secret = JSON.parse(raw) as WalletSecret;
      if (typeof secret.secret !== 'string' || signerOf(secret.secret) !== meta.signerPublicKey) throw new Error('La clave local no corresponde a esta wallet.');
      return {
        secret: secret.secret, ...(typeof secret.mnemonic === 'string' ? { mnemonic: secret.mnemonic } : {}),
        accountId: meta.accountId, oualiAddress: meta.oualiAddress,
        ...(meta.backupAcknowledged !== undefined ? { backupAcknowledged: meta.backupAcknowledged } : {}),
        ...(meta.backupFingerprint ? { backupFingerprint: meta.backupFingerprint } : {}),
      };
    },
    async updateMeta(patch: Partial<Pick<WalletMeta, 'oualiAddress' | 'backupAcknowledged' | 'backupFingerprint' | 'accountId'>>, userId?: string) {
      const meta = await readMeta(userId);
      if (!meta) throw new Error('No hay una wallet guardada en este dispositivo.');
      const next = { ...meta, ...patch };
      await kv.set(metaKey(userId), JSON.stringify(next), false);
      return next;
    },
    // Keep only the public metadata required for balances and history. This is
    // the safe choice for a borrowed/shared phone: the signing key is removed
    // and every signing entry point already refuses non-biometric wallets.
    async disableSigning(userId?: string) {
      const meta = await readMeta(userId);
      if (!meta) throw new Error('No hay una wallet guardada en este dispositivo.');
      await kv.remove(secretKey(userId));
      const next: WalletMeta = { ...meta, protection: 'none' };
      await kv.set(metaKey(userId), JSON.stringify(next), false);
      return next;
    },
    async remove(userId?: string) {
      await kv.remove(secretKey(userId));
      await kv.remove(metaKey(userId));
    },
  };
}
