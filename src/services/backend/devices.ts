import { bytesToHex, randomBytes } from '@noble/hashes/utils.js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { requireBackend } from './client';

export type DeviceRow = { id: string; label: string; platform: 'ios' | 'android' | 'web'; created_at: string; last_seen_at: string; revoked_at: string | null };
export class DeviceRevokedError extends Error {
  constructor() { super('Este dispositivo fue desactivado desde otro dispositivo. Por seguridad cerramos la sesión y borramos la wallet de este teléfono.'); this.name = 'DeviceRevokedError'; }
}

const ID_KEY = 'movya.device.id';
const SEEN_KEY = (owner: string) => `movya.devices.seen.${owner.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
const memory = new Map<string, string>();
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const get = async (key: string) => Platform.OS === 'web' ? memory.get(key) ?? null : SecureStore.getItemAsync(key, options);
const set = async (key: string, value: string) => { if (Platform.OS === 'web') memory.set(key, value); else await SecureStore.setItemAsync(key, value, options); };
const remove = async (key: string) => { if (Platform.OS === 'web') memory.delete(key); else await SecureStore.deleteItemAsync(key); };

function uuid() {
  const b = randomBytes(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = bytesToHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export async function currentDeviceId() {
  const existing = await get(ID_KEY);
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  const id = uuid(); await set(ID_KEY, id); return id;
}
// A revoked id is never reused: the next sign-in registers a new device.
export async function forgetDeviceId() { await remove(ID_KEY); }
export function deviceLabel() {
  const version = String(Platform.Version ?? '');
  return Platform.OS === 'ios' ? `iPhone o iPad · iOS ${version}` : Platform.OS === 'android' ? `Android ${version}` : 'Navegador web';
}
export function devicePlatform(): DeviceRow['platform'] { return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web'; }

// Registers or refreshes this device; throws if it was revoked elsewhere.
export async function touchDevice() {
  const result = await requireBackend().rpc('touch_device', { device_id: await currentDeviceId(), device_label: deviceLabel(), device_platform: devicePlatform() });
  if (result.error) throw result.error;
  const row = result.data as DeviceRow;
  if (row.revoked_at) throw new DeviceRevokedError();
  return row;
}
export async function listDevices() {
  const result = await requireBackend().from('devices').select('id,label,platform,created_at,last_seen_at,revoked_at').order('last_seen_at', { ascending: false });
  if (result.error) throw result.error;
  return result.data as DeviceRow[];
}
export async function revokeDevice(id: string) {
  const result = await requireBackend().rpc('revoke_device', { device_id: id });
  if (result.error) throw result.error;
}
// Marks every other device revoked and ends their Supabase sessions.
export async function revokeOtherDevices() {
  const db = requireBackend();
  const result = await db.rpc('revoke_other_devices', { current_device: await currentDeviceId() });
  if (result.error) throw result.error;
  const signOut = await db.auth.signOut({ scope: 'others' });
  if (signOut.error) throw signOut.error;
  return result.data as number;
}
// Devices registered since this device last reviewed the list ("new sign-in" alerts).
export async function newDevicesSinceLastReview(owner: string, devices: DeviceRow[], current: string) {
  const seen = Number(await get(SEEN_KEY(owner)) ?? '0');
  if (!seen) { await set(SEEN_KEY(owner), String(Date.now())); return []; }
  return devices.filter(device => device.id !== current && !device.revoked_at && Date.parse(device.created_at) > seen);
}
export async function markDevicesReviewed(owner: string) { await set(SEEN_KEY(owner), String(Date.now())); }
