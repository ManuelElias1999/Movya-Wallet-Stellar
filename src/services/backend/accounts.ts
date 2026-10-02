import { requireBackend } from './client';
import { readWallet, writeWallet } from './storage';
import { recoverWallet, type RecoveryProgress, type WalletRecord } from './walletRecovery';
import { Platform } from 'react-native';

export async function unlockUserWallet(userId: string, password: string, options: { signal?: AbortSignal; onProgress?: (stage: RecoveryProgress) => void } = {}) {
  const db = requireBackend();
  return recoverWallet({
    getBackup: async () => {
      const result = await db.from('wallet_backups').select('owner_id, public_key, backup').eq('owner_id', userId).maybeSingle();
      if (result.error) throw result.error;
      return result.data as WalletRecord | null;
    },
    register: async (publicKey, backup) => {
      const result = await db.rpc('register_wallet', { wallet_public_key: publicKey, wallet_backup: backup });
      if (result.error) throw result.error;
      return result.data as WalletRecord;
    },
    readLocal: readWallet, writeLocal: writeWallet,
  }, userId, password, false, { ...options, allowLocalCache: Platform.OS !== 'web' });
}
