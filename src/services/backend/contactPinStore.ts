import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { PinnedAddress, PinStore } from './contactPins';

// One item per contact: SecureStore values should stay small, and a single
// list would outgrow that limit after a handful of contacts.
const safe = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');
const pinKey = (owner: string, contactId: string) => `movya.contacts.pin.${safe(owner)}.${safe(contactId)}`;
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

function parse(raw: string | null): PinnedAddress | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PinnedAddress>;
    if (typeof value?.address !== 'string') return null;
    return { address: value.address, ...(typeof value.email === 'string' ? { email: value.email } : {}) };
  } catch { return null; }
}

// Web has no protected storage; pins there are a convenience that only an
// attacker who already controls the page could alter.
const web = {
  get: (key: string) => { try { return typeof window === 'undefined' ? null : window.localStorage.getItem(key); } catch { return null; } },
  set: (key: string, value: string) => { try { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); } catch { /* storage blocked */ } },
  remove: (key: string) => { try { if (typeof window !== 'undefined') window.localStorage.removeItem(key); } catch { /* storage blocked */ } },
};

export const contactPinStore: PinStore = {
  async read(owner, contactId) {
    const key = pinKey(owner, contactId);
    return parse(Platform.OS === 'web' ? web.get(key) : await SecureStore.getItemAsync(key));
  },
  async write(owner, contactId, pin) {
    const key = pinKey(owner, contactId); const value = JSON.stringify(pin);
    if (Platform.OS === 'web') web.set(key, value);
    else await SecureStore.setItemAsync(key, value, options);
  },
  async remove(owner, contactId) {
    const key = pinKey(owner, contactId);
    if (Platform.OS === 'web') web.remove(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
