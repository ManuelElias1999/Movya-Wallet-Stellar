import { strict as assert } from 'node:assert';
import { pbkdf2Sync } from 'node:crypto';
import { test } from 'node:test';
import { BACKUP_KDF_ITERATIONS, deriveBackupKey } from '../src/services/backend/passwordKey';

test('WebCrypto and Expo Go fallback preserve the existing 600,000-round backup key', async () => {
  const password = new TextEncoder().encode('contraseña-con-ñ-y-🔐');
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
  const expected = Uint8Array.from(pbkdf2Sync(password, salt, 600_000, 32, 'sha256'));
  assert.equal(BACKUP_KDF_ITERATIONS, 600_000);
  assert.ok(globalThis.crypto.subtle);
  assert.deepEqual(await deriveBackupKey(password, salt), expected);
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
  try {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    assert.deepEqual(await deriveBackupKey(password, salt), expected);
  } finally { Object.defineProperty(globalThis, 'crypto', original); }
  assert.deepEqual(salt, Uint8Array.from({ length: 16 }, (_, i) => i));
  assert.equal(new TextDecoder().decode(password), 'contraseña-con-ñ-y-🔐');
});
