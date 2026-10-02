import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type StoredWallet = { secret: string; mnemonic?: string; backupAcknowledged?: boolean; oualiAddress: string };
const memory = new Map<string, string>();
const walletKey = (userId?: string) => userId ? `movya.testnet.wallet.user.${userId}` : 'movya.testnet.wallet.v1';
export async function readWallet(userId?: string): Promise<StoredWallet | null> {
  const key = walletKey(userId);
  const raw = Platform.OS === 'web' ? memory.get(key) : await SecureStore.getItemAsync(key);
  return raw ? JSON.parse(raw) as StoredWallet : null;
}
export async function writeWallet(wallet: StoredWallet, userId?: string) {
  const key = walletKey(userId);
  if (Platform.OS === 'web') memory.set(key, JSON.stringify(wallet));
  else await SecureStore.setItemAsync(key, JSON.stringify(wallet), { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export async function removeWallet(userId: string) {
  const key = walletKey(userId);
  if (Platform.OS === 'web') memory.delete(key);
  else await SecureStore.deleteItemAsync(key);
}

// Sessions can exceed a single Keychain item. Write chunks first, then atomically
// replace the manifest. Never keep a half-written session or unencrypted tokens.
const safeKey = (key: string) => `movya.auth.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
async function removeChunks(key: string, manifest: string | null) {
  if (!manifest) return;
  const data = JSON.parse(manifest) as { generation: string; count: number };
  if (data.count < 1 || data.count > 100) return;
  await Promise.all(Array.from({ length: data.count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${data.generation}.${i}`)));
}
export const sessionStorage = {
  async getItem(input: string) {
    if (Platform.OS === 'web') return typeof window === 'undefined' ? null : window.localStorage.getItem(input);
    const key = safeKey(input); const raw = await SecureStore.getItemAsync(key);
    if (!raw) return null;
    const manifest = JSON.parse(raw) as { generation: string; count: number };
    if (manifest.count < 1 || manifest.count > 100) throw new Error('Sesión guardada inválida.');
    const chunks = await Promise.all(Array.from({ length: manifest.count }, (_, i) => SecureStore.getItemAsync(`${key}.${manifest.generation}.${i}`)));
    if (chunks.some((chunk) => chunk === null)) throw new Error('Sesión incompleta. Inicia sesión nuevamente.');
    return Buffer.from(chunks.join(''), 'base64').toString('utf8');
  },
  async setItem(input: string, value: string) {
    if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.localStorage.setItem(input, value); return; }
    const key = safeKey(input); const previous = await SecureStore.getItemAsync(key);
    const generation = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
    const encoded = Buffer.from(value, 'utf8').toString('base64');
    const chunks = encoded.match(/.{1,1500}/g) ?? [''];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${generation}.${i}`, chunk, options)));
    await SecureStore.setItemAsync(key, JSON.stringify({ generation, count: chunks.length }), options);
    await removeChunks(key, previous).catch(() => undefined);
  },
  async removeItem(input: string) {
    if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.localStorage.removeItem(input); return; }
    const key = safeKey(input); const previous = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key); await removeChunks(key, previous);
  },
};
