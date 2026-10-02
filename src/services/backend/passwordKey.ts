import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const BACKUP_KDF_ITERATIONS = 600_000;
export async function deriveBackupKey(password: Uint8Array, salt: Uint8Array): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return pbkdf2Async(sha256, password, salt, { c: BACKUP_KDF_ITERATIONS, dkLen: 32 });
  // Use the host's crypto worker when available (web), preserving the exact
  // existing PBKDF2-SHA256 format. Expo Go falls back to the portable engine.
  const input = Uint8Array.from(password);
  try {
    const key = await subtle.importKey('raw', input.buffer, 'PBKDF2', false, ['deriveBits']);
    const result = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: BACKUP_KDF_ITERATIONS, salt: Uint8Array.from(salt).buffer }, key, 256);
    return new Uint8Array(result);
  } finally { input.fill(0); }
}
