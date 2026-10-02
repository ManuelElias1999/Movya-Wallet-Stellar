import { Keypair } from '@stellar/stellar-sdk/base';
import { decryptRecovery, encryptRecovery, encryptWallet, type WalletBackup } from './vault';
import { createRecoveryWallet, type RecoveryMaterial } from '../stellar/recovery';
import { assertAccessActive } from './accessOperation';

export type WalletRecord = { owner_id: string; public_key: string; backup: WalletBackup };
type LocalWallet = RecoveryMaterial & { oualiAddress: string; backupAcknowledged?: boolean };
type WalletStorage = {
  getBackup: () => Promise<WalletRecord | null>;
  register: (publicKey: string, backup: WalletBackup) => Promise<WalletRecord>;
  readLocal: (owner?: string) => Promise<LocalWallet | null>;
  writeLocal: (wallet: LocalWallet, owner: string) => Promise<void>;
};
export type RecoveryProgress = 'reading' | 'creating' | 'encrypting' | 'registering' | 'decrypting' | 'saving';
export async function recoverWallet(storage: WalletStorage, userId: string, password: string, linkExisting: boolean, options: { signal?: AbortSignal; onProgress?: (stage: RecoveryProgress) => void } = {}) {
  const progress = (stage: RecoveryProgress) => { assertAccessActive(options.signal); options.onProgress?.(stage); };
  progress('reading');
  let record = await storage.getBackup();
  assertAccessActive(options.signal);
  let created: { material: RecoveryMaterial; publicKey: string; backup: WalletBackup } | undefined;
  if (!record) {
    progress('creating');
    const legacy = linkExisting ? await storage.readLocal() : null;
    assertAccessActive(options.signal);
    const material = legacy ?? createRecoveryWallet();
    const pair = Keypair.fromSecret(material.secret);
    progress('encrypting');
    const backup = material.mnemonic ? await encryptRecovery(material, password, userId) : await encryptWallet(material.secret, password, userId);
    created = { material, publicKey: pair.publicKey(), backup };
    progress('registering');
    // The server returns the winner if two devices create simultaneously.
    record = await storage.register(pair.publicKey(), backup);
  }
  assertAccessActive(options.signal);
  if (!record || record.owner_id !== userId) throw new Error('La wallet no corresponde a esta cuenta.');
  // Reuse our own material only when the immutable RPC returns exactly the
  // backup we just encrypted. A concurrent registration winner must be decrypted.
  const ownBackup = created && record.public_key === created.publicKey
    && (['version', 'salt', 'nonce', 'ciphertext'] as const).every(key => record.backup[key] === created.backup[key]);
  let material: RecoveryMaterial;
  if (ownBackup && created) material = created.material;
  else { progress('decrypting'); material = await decryptRecovery(record.backup, password, userId, record.public_key); }
  assertAccessActive(options.signal);
  const local = await storage.readLocal(userId);
  assertAccessActive(options.signal);
  if (local && Keypair.fromSecret(local.secret).publicKey() !== record.public_key) throw new Error('La wallet local no coincide con tu respaldo.');
  progress('saving');
  await storage.writeLocal({ ...material, oualiAddress: local?.oualiAddress ?? '', backupAcknowledged: local?.backupAcknowledged ?? false }, userId);
  assertAccessActive(options.signal);
  return record.public_key;
}
