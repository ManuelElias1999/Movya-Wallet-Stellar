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

test('an available native engine is preferred and keeps the exact backup parameters', async () => {
  const password = new TextEncoder().encode('contraseña-con-ñ-y-🔐');
  const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
  const expected = Uint8Array.from(pbkdf2Sync(password, salt, 600_000, 32, 'sha256'));
  const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto')!;
  let calls = 0;
  try {
    Object.defineProperty(globalThis, 'crypto', { get() { throw new Error('Native must precede WebCrypto'); }, configurable: true });
    const key = await deriveBackupKey(password, salt, async (actualPassword, actualSalt, iterations) => {
      calls++;
      assert.deepEqual(actualPassword, password); assert.deepEqual(actualSalt, salt);
      assert.equal(iterations, 600_000);
      return Uint8Array.from(pbkdf2Sync(actualPassword, actualSalt, iterations, 32, 'sha256'));
    });
    assert.deepEqual(key, expected); assert.equal(calls, 1);
  } finally { Object.defineProperty(globalThis, 'crypto', original); }
});

test('a failing or malformed native result fails closed instead of silently changing engines', async () => {
  const password = new TextEncoder().encode('Movya-test-password-2026'); const salt = new Uint8Array(16);
  await assert.rejects(deriveBackupKey(password, salt, async () => { throw new Error('native unavailable'); }), /native unavailable/);
  await assert.rejects(deriveBackupKey(password, salt, async () => new Uint8Array(31)), /cifrado/);
});
