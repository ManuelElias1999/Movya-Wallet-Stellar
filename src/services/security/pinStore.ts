import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { deriveBackupKey } from '../backend/passwordKey';
import { createPinLock, type PinState } from './pinLock';

const memory = new Map<string, string>();
const key = (owner: string) => `movya.pin.${owner.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export function pinLockFor(owner: string) {
  return createPinLock({
    read: async () => {
      const raw = Platform.OS === 'web' ? memory.get(key(owner)) : await SecureStore.getItemAsync(key(owner), options);
      return raw ? JSON.parse(raw) as PinState : null;
    },
    write: async state => {
      const value = JSON.stringify(state);
      if (Platform.OS === 'web') memory.set(key(owner), value); else await SecureStore.setItemAsync(key(owner), value, options);
    },
    remove: async () => { if (Platform.OS === 'web') memory.delete(key(owner)); else await SecureStore.deleteItemAsync(key(owner)); },
    now: () => Date.now(),
    // Same slow KDF as the backup (native-accelerated where available).
    derive: async (pin, salt) => {
      const pinBytes = Uint8Array.from(Buffer.from(`movya-pin:${pin}`, 'utf8'));
      try { return bytesToHex(await deriveBackupKey(pinBytes, hexToBytes(salt))); } finally { pinBytes.fill(0); }
    },
    randomSalt: () => bytesToHex(randomBytes(16)),
  });
}
