import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { KnownRecipient } from './recipientRisk';

// Addresses this device has already paid, used to flag new recipients and
// look-alike addresses. Kept on the device only.
const MAX = 50;
const memory = new Map<string, string>();
const key = (owner: string) => `movya.recipients.${owner.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
async function read(owner: string): Promise<KnownRecipient[]> {
  try {
    const raw = Platform.OS === 'web' ? memory.get(key(owner)) : await SecureStore.getItemAsync(key(owner));
    const value = raw ? JSON.parse(raw) as KnownRecipient[] : [];
    return Array.isArray(value) ? value.filter(entry => typeof entry?.address === 'string' && typeof entry?.label === 'string') : [];
  } catch { return []; }
}
export const readRecentRecipients = read;
export async function rememberRecipient(owner: string, recipient: KnownRecipient) {
  const next = [recipient, ...(await read(owner)).filter(entry => entry.address !== recipient.address)].slice(0, MAX);
  const value = JSON.stringify(next);
  try {
    if (Platform.OS === 'web') memory.set(key(owner), value);
    else await SecureStore.setItemAsync(key(owner), value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  } catch { /* best effort */ }
}
