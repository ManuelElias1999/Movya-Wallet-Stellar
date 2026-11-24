import { Keypair } from '@stellar/stellar-sdk/base';
import { decryptRecovery, encryptRecovery, encryptRecoveryV3, encryptWallet, fingerprintBackup, type WalletBackup } from './vault';
import type { AccountKeys } from './accountKeys';
import { createRecoveryWallet, type RecoveryMaterial } from '../stellar/recovery';
import { assertAccessActive } from './accessOperation';

export type WalletRecord = { owner_id: string; public_key: string; backup: WalletBackup };
type LocalWallet = RecoveryMaterial & { oualiAddress: string; backupAcknowledged?: boolean; backupFingerprint?: string };
type LocalWalletMeta = Pick<LocalWallet, 'oualiAddress' | 'backupAcknowledged' | 'backupFingerprint'> & { accountId?: string };
type WalletStorage = {
  getBackup: () => Promise<WalletRecord | null>;
  register: (publicKey: string, backup: WalletBackup) => Promise<WalletRecord>;
  readLocal: (owner?: string) => Promise<LocalWallet | null>;
  // Metadata is deliberately separate from the protected signing key. A
  // password login can preserve local flags without showing a Face ID prompt.
  readMeta?: (owner: string) => Promise<LocalWalletMeta | null>;
  writeLocal: (wallet: LocalWallet, owner: string) => Promise<void>;
};
export type RecoveryProgress = 'reading' | 'creating' | 'encrypting' | 'registering' | 'decrypting' | 'local' | 'saving';
// allowLocalCache is only supplied by the native account flow after Supabase
// verifies credentials; portable callers still always verify the backup password.
export async function recoverWallet(storage: WalletStorage, userId: string, password: string, linkExisting: boolean, options: { signal?: AbortSignal; onProgress?: (stage: RecoveryProgress) => void; allowLocalCache?: boolean; keys?: AccountKeys } = {}) {
  const progress = (stage: RecoveryProgress) => { assertAccessActive(options.signal); options.onProgress?.(stage); };
  progress('reading');
  // Explicitly disabling the cache means the person chose password login.
  // Do not open protected storage in that path or iOS will show a redundant
  // Face ID prompt after password autofill/authentication.
  const readProtectedLocal = options.allowLocalCache !== false;
  let [record, local, localMeta] = await Promise.all([
    storage.getBackup(),
    readProtectedLocal ? storage.readLocal(userId) : Promise.resolve(null),
    storage.readMeta?.(userId) ?? Promise.resolve(null),
  ]);
  assertAccessActive(options.signal);
  let created: { material: RecoveryMaterial; publicKey: string; backup: WalletBackup } | undefined;
  if (!record) {
    progress('creating');
    const legacy = linkExisting ? await storage.readLocal() : null;
    assertAccessActive(options.signal);
    const material = legacy ?? createRecoveryWallet();
    const pair = Keypair.fromSecret(material.secret);
    progress('encrypting');
    // Accounts that sign in with v3 keys get a v3 backup from the start.
    const backup = options.keys ? encryptRecoveryV3(material, options.keys, userId)
      : material.mnemonic ? await encryptRecovery(material, password, userId) : await encryptWallet(material.secret, password, userId);
    created = { material, publicKey: pair.publicKey(), backup };
    progress('registering');
    // The server returns the winner if two devices create simultaneously.
    record = await storage.register(pair.publicKey(), backup);
  }
  assertAccessActive(options.signal);
  if (!record || record.owner_id !== userId) throw new Error('La wallet no corresponde a esta cuenta.');
  const fingerprint = fingerprintBackup(record.backup, userId, record.public_key);
  const localState = local ?? localMeta;
  if (local && (local.accountId ?? Keypair.fromSecret(local.secret).publicKey()) !== record.public_key) throw new Error('La wallet local no coincide con tu respaldo.');
  if (!local && localMeta?.accountId && localMeta.accountId !== record.public_key) throw new Error('La wallet local no coincide con tu respaldo.');
  // Reuse our own material only when the immutable RPC returns exactly the
  // backup we just encrypted. A concurrent registration winner must be decrypted.
  const ownBackup = created && record.public_key === created.publicKey
    && (['version', 'salt', 'nonce', 'ciphertext'] as const).every(key => record.backup[key] === created.backup[key]);
  let material: RecoveryMaterial;
  if (ownBackup && created) material = created.material;
  else if (options.allowLocalCache && local?.backupFingerprint === fingerprint) {
    progress('local');
    material = { secret: local.secret, ...(local.mnemonic ? { mnemonic: local.mnemonic } : {}), ...(local.accountId ? { accountId: local.accountId } : {}) };
  }
  else { progress('decrypting'); material = await decryptRecovery(record.backup, { password, keys: options.keys }, userId, record.public_key); }
  assertAccessActive(options.signal);
  progress('saving');
  await storage.writeLocal({ ...material, oualiAddress: localState?.oualiAddress ?? '', backupAcknowledged: localState?.backupAcknowledged ?? false, backupFingerprint: fingerprint }, userId);
  assertAccessActive(options.signal);
  return record.public_key;
}
