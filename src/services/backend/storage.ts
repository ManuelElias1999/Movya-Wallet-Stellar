import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { Keypair } from '@stellar/stellar-sdk/base';

import { createWalletStore, type KeyValue } from './walletStore';
export type { StoredWallet, WalletMeta } from './walletStore';
import type { StoredWallet } from './walletStore';

const memory = new Map<string, string>();
const plain = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const guarded = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  requireAuthentication: true,
  authenticationPrompt: 'Confirma que eres tú para usar tu wallet Movya',
};
const keyValue: KeyValue = {
  get: async (key, protectedItem) => Platform.OS === 'web' ? memory.get(key) ?? null : SecureStore.getItemAsync(key, protectedItem ? guarded : plain),
  set: async (key, value, protectedItem) => {
    if (Platform.OS === 'web') memory.set(key, value);
    else await SecureStore.setItemAsync(key, value, protectedItem ? guarded : plain);
  },
  remove: async key => { if (Platform.OS === 'web') memory.delete(key); else await SecureStore.deleteItemAsync(key); },
  // Biometric protection needs enrolled biometrics. Without it the wallet can
  // be viewed after password authentication, but signing stays disabled.
  canProtect: () => {
    if (Platform.OS === 'web') return false;
    try { return SecureStore.canUseBiometricAuthentication(); } catch { return false; }
  },
};
const store = createWalletStore(keyValue, secret => Keypair.fromSecret(secret).publicKey());

// Reads the key: shows the biometric prompt when the wallet is protected.
export const readWallet = (userId?: string) => store.readFull(userId);
// No prompt: account, signer public key and flags only.
export const readWalletMeta = (userId?: string) => store.readMeta(userId);
export const writeWallet = (wallet: StoredWallet, userId?: string) => store.write(wallet, userId);
export const replaceWalletAfterPassword = (wallet: StoredWallet, userId?: string) => store.replaceAfterPassword(wallet, userId);
export const updateWalletMeta = store.updateMeta;
export const disableLocalSigning = store.disableSigning;
export const removeWallet = (userId: string) => store.remove(userId);
export function biometricProtectionAvailable() { return keyValue.canProtect(); }

// The new wallet of an emergency transfer, kept behind biometrics until the
// account points to it, so an interruption never loses its key.
export type PendingSweep = { secret: string; mnemonic: string; from: string; hash?: string; createdAt?: number };
const sweepKey = (owner: string) => `movya.sweep.pending.${owner.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
export async function writePendingSweep(owner: string, pending: PendingSweep) {
  await keyValue.set(sweepKey(owner), JSON.stringify(pending), keyValue.canProtect());
  await keyValue.set(`${sweepKey(owner)}.protected`, keyValue.canProtect() ? '1' : '0', false);
}
export async function readPendingSweep(owner: string): Promise<PendingSweep | null> {
  const protectedItem = (await keyValue.get(`${sweepKey(owner)}.protected`, false)) === '1';
  const raw = await keyValue.get(sweepKey(owner), protectedItem);
  return raw ? JSON.parse(raw) as PendingSweep : null;
}
export async function clearPendingSweep(owner: string) {
  await keyValue.remove(sweepKey(owner)); await keyValue.remove(`${sweepKey(owner)}.protected`);
}
export async function clearWalletOnLogout(userId: string) {
  // Native keys stay in the per-user Keychain behind biometrics. Auth guards
  // disable every wallet read/sign/reveal after logout; the next login
  // verifies credentials. Web keys have no protected persistence.
  if (Platform.OS === 'web') await removeWallet(userId);
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
