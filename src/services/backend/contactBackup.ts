import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { requireBackend } from './client';
import { createContactVault, type KnownVersion, type SealedBackup } from './contactVault';

const memory = new Map<string, string>();
const safe = (owner: string) => owner.replace(/[^a-zA-Z0-9._-]/g, '_');
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const get = async (key: string) => Platform.OS === 'web' ? memory.get(key) ?? null : SecureStore.getItemAsync(key, options);
const set = async (key: string, value: string) => { if (Platform.OS === 'web') memory.set(key, value); else await SecureStore.setItemAsync(key, value, options); };
const keyItem = (owner: string) => `movya.contacts.key.${safe(owner)}`;
const knownItem = (owner: string) => `movya.contacts.known.${safe(owner)}`;

// The contacts key comes from the v3 derivation at sign-in and stays on this
// device while the account is signed in here.
export async function rememberContactsKey(owner: string, key: Uint8Array) { await set(keyItem(owner), bytesToHex(key)); }

export async function contactVaultFor(owner: string) {
  const hex = await get(keyItem(owner));
  if (!hex || !/^[a-f0-9]{64}$/.test(hex)) return null; // legacy accounts: no key until they migrate to v3
  const key = hexToBytes(hex);
  const db = requireBackend();
  return createContactVault(owner, {
    fetch: async () => {
      const result = await db.from('contact_backups').select('version, backup').eq('owner_id', owner).maybeSingle();
      if (result.error) throw result.error;
      return result.data ? { version: Number(result.data.version), backup: result.data.backup as SealedBackup } : null;
    },
    put: async (version, backup) => {
      const result = await db.rpc('put_contact_backup', { new_version: version, new_backup: backup });
      if (result.error) throw result.error;
    },
    readKnown: async () => { const raw = await get(knownItem(owner)); return raw ? JSON.parse(raw) as KnownVersion : null; },
    writeKnown: async known => set(knownItem(owner), JSON.stringify(known)),
    seal: (plaintext, aad) => {
      const nonce = randomBytes(12);
      const ciphertext = gcm(key, nonce, Uint8Array.from(Buffer.from(aad, 'utf8'))).encrypt(Uint8Array.from(Buffer.from(plaintext, 'utf8')));
      return { nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext) };
    },
    open: (backup, aad) => Buffer.from(gcm(key, hexToBytes(backup.nonce), Uint8Array.from(Buffer.from(aad, 'utf8'))).decrypt(hexToBytes(backup.ciphertext))).toString('utf8'),
    hash: value => bytesToHex(sha256(Uint8Array.from(Buffer.from(value, 'utf8')))),
    now: () => Date.now(),
  });
}
