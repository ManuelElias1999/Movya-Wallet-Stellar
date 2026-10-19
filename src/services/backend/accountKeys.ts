import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import { deriveBackupKey } from './passwordKey';

// Backup format v3. One slow derivation (PBKDF2-SHA256, 600,000 iterations,
// per-account random salt) produces a master secret; HKDF splits it into two
// independent keys with different labels:
//   loginSecret → sent to Supabase Auth in place of the typed password
//   backupKey   → encrypts the wallet backup; never leaves the device
// Capturing loginSecret (for example at the auth service) allows signing in
// but not decrypting the backup without guessing the password offline.
// HKDF does not make a weak password strong; the slow KDF and the 12-character
// minimum do that.
export const V3_LOGIN_LABEL = 'movya/v3/login';
export const V3_BACKUP_LABEL = 'movya/v3/backup';
// Contacts get their own key so the contact backup can change often without
// touching the wallet backup.
export const V3_CONTACTS_LABEL = 'movya/v3/contacts';
export type AccountKeys = { salt: string; loginSecret: string; backupKey: Uint8Array; contactsKey: Uint8Array };

export function wipeKeys(keys?: AccountKeys) { keys?.backupKey.fill(0); keys?.contactsKey.fill(0); }
export function newKdfSalt() { return bytesToHex(randomBytes(16)); }
export function assertKdfSalt(salt: string) {
  if (!/^[a-f0-9]{32}$/.test(salt)) throw new Error('Parámetros de acceso inválidos.');
}

// Fixed prefix keeps the derived value valid under common Supabase password
// rules (upper, lower, digit, symbol). 4 + 64 = 68 bytes, under bcrypt's 72.
export const loginSecretFromBytes = (bytes: Uint8Array) => `Mv3!${bytesToHex(bytes)}`;

export async function deriveAccountKeys(password: string, salt: string): Promise<AccountKeys> {
  assertKdfSalt(salt);
  const passwordBytes = Uint8Array.from(Buffer.from(password, 'utf8'));
  const saltBytes = hexToBytes(salt);
  let master: Uint8Array | undefined; let login: Uint8Array | undefined;
  try {
    const derived: Uint8Array = await deriveBackupKey(passwordBytes, saltBytes);
    master = derived;
    const loginBytes: Uint8Array = hkdf(sha256, derived, saltBytes, V3_LOGIN_LABEL, 32);
    login = loginBytes;
    const backupKey = hkdf(sha256, derived, saltBytes, V3_BACKUP_LABEL, 32);
    const contactsKey = hkdf(sha256, derived, saltBytes, V3_CONTACTS_LABEL, 32);
    return { salt, loginSecret: loginSecretFromBytes(loginBytes), backupKey, contactsKey };
  } finally { master?.fill(0); login?.fill(0); passwordBytes.fill(0); }
}
