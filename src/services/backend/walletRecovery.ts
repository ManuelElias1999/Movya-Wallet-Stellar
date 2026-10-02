import { Keypair } from '@stellar/stellar-sdk/base';
import { decryptWallet, encryptWallet, type WalletBackup } from './vault';

export type WalletRecord = { owner_id: string; public_key: string; backup: WalletBackup };
type LocalWallet = { secret: string; oualiAddress: string };
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
    const pair = legacy ? Keypair.fromSecret(legacy.secret) : Keypair.random();
    const backup = await encryptWallet(pair.secret(), password, userId);
    // The server returns the winner if two devices create simultaneously.
    record = await storage.register(pair.publicKey(), backup);
  }
  if (!record || record.owner_id !== userId) throw new Error('La wallet no corresponde a esta cuenta.');
  const secret = await decryptWallet(record.backup, password, userId, record.public_key);
  const local = await storage.readLocal(userId);
  if (local && Keypair.fromSecret(local.secret).publicKey() !== record.public_key) throw new Error('La wallet local no coincide con tu respaldo.');
  await storage.writeLocal({ secret, oualiAddress: local?.oualiAddress ?? '' }, userId);
  return record.public_key;
}
