import { Keypair } from '@stellar/stellar-sdk/base';
import { decryptRecovery, encryptRecovery, encryptWallet, type WalletBackup } from './vault';
import { createRecoveryWallet, type RecoveryMaterial } from '../stellar/recovery';

export type WalletRecord = { owner_id: string; public_key: string; backup: WalletBackup };
type LocalWallet = RecoveryMaterial & { oualiAddress: string; backupAcknowledged?: boolean };
type WalletStorage = {
  getBackup: () => Promise<WalletRecord | null>;
  register: (publicKey: string, backup: WalletBackup) => Promise<WalletRecord>;
  readLocal: (owner?: string) => Promise<LocalWallet | null>;
  writeLocal: (wallet: LocalWallet, owner: string) => Promise<void>;
};
export async function recoverWallet(storage: WalletStorage, userId: string, password: string, linkExisting: boolean) {
  let record = await storage.getBackup();
  if (!record) {
    const legacy = linkExisting ? await storage.readLocal() : null;
    const material = legacy ?? createRecoveryWallet();
    const pair = Keypair.fromSecret(material.secret);
    const backup = material.mnemonic ? await encryptRecovery(material, password, userId) : await encryptWallet(material.secret, password, userId);
    // The server returns the winner if two devices create simultaneously.
    record = await storage.register(pair.publicKey(), backup);
  }
  if (!record || record.owner_id !== userId) throw new Error('La wallet no corresponde a esta cuenta.');
  const material = await decryptRecovery(record.backup, password, userId, record.public_key);
  const local = await storage.readLocal(userId);
  if (local && Keypair.fromSecret(local.secret).publicKey() !== record.public_key) throw new Error('La wallet local no coincide con tu respaldo.');
  await storage.writeLocal({ ...material, oualiAddress: local?.oualiAddress ?? '', backupAcknowledged: local?.backupAcknowledged ?? false }, userId);
  return record.public_key;
}
