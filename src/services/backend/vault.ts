import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import { validateRecoveryMaterial, type RecoveryMaterial } from '../stellar/recovery';
import { deriveAccountKeys, wipeKeys, type AccountKeys } from './accountKeys';
import { deriveBackupKey } from './passwordKey';

// v1: secret only, key = PBKDF2(password). v2: secret + words, same key.
// v3: secret + words (+ account after a rotation), key = HKDF(PBKDF2(password,
// account salt), "backup"); the login uses a different HKDF output.
export type WalletBackup = { version: 1 | 2 | 3; salt: string; nonce: string; ciphertext: string };
// Wrong password, a changed password (reset by email) or a damaged backup.
export class BackupDecryptError extends Error {
  readonly backupDecrypt = true;
  constructor() { super('No se pudo abrir tu wallet. Usa la contraseña con la que la creaste. No crearemos otra encima de ella.'); this.name = 'BackupDecryptError'; }
}
// The typed password, optionally with keys already derived for this salt.
export type BackupCredential = string | { password: string; keys?: AccountKeys };
const bytes = (text: string) => Uint8Array.from(Buffer.from(text, 'utf8'));
const aad = (version: number, userId: string, publicKey: string) => bytes(`movya:testnet:v${version}:${userId}:${publicKey}`);
const passwordOf = (credential: BackupCredential) => typeof credential === 'string' ? credential : credential.password;
const payloadOf = (material: RecoveryMaterial) => JSON.stringify({ secret: material.secret, ...(material.mnemonic ? { mnemonic: material.mnemonic } : {}), ...(material.accountId ? { accountId: material.accountId } : {}) });

async function encrypt(material: RecoveryMaterial, version: 1 | 2, password: string, userId: string): Promise<WalletBackup> {
  if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
  if (material.accountId) throw new Error('Una wallet con clave rotada necesita el respaldo v3.');
  const publicKey = validateRecoveryMaterial(material);
  const salt = randomBytes(16); const nonce = randomBytes(12); const passwordBytes = bytes(password);
  let key: Uint8Array | undefined; let plaintext: Uint8Array | undefined;
  try {
    key = await deriveBackupKey(passwordBytes, salt);
    // Build an explicit payload: do not serialize arbitrary local wallet fields.
    plaintext = bytes(version === 1 ? material.secret : payloadOf(material));
    return { version, salt: bytesToHex(salt), nonce: bytesToHex(nonce), ciphertext: bytesToHex(gcm(key, nonce, aad(version, userId, publicKey)).encrypt(plaintext)) };
  } finally { key?.fill(0); plaintext?.fill(0); passwordBytes.fill(0); }
}
export function encryptWallet(secret: string, password: string, userId: string) {
  return encrypt({ secret }, 1, password, userId);
}
export function encryptRecovery(material: RecoveryMaterial, password: string, userId: string) {
  return encrypt(material, 2, password, userId);
}
// v3 uses the account's backup key; its salt field records the KDF salt.
export function encryptRecoveryV3(material: RecoveryMaterial, keys: AccountKeys, userId: string): WalletBackup {
  const publicKey = validateRecoveryMaterial(material);
  const nonce = randomBytes(12);
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = bytes(payloadOf(material));
    return { version: 3, salt: keys.salt, nonce: bytesToHex(nonce), ciphertext: bytesToHex(gcm(keys.backupKey, nonce, aad(3, userId, publicKey)).encrypt(plaintext)) };
  } finally { plaintext?.fill(0); }
}
export function fingerprintBackup(backup: WalletBackup, userId: string, publicKey: string): string {
  if ((backup?.version !== 1 && backup?.version !== 2 && backup?.version !== 3) || !/^[a-f0-9]{32}$/.test(backup.salt) || !/^[a-f0-9]{24}$/.test(backup.nonce)
    || !/^[a-f0-9]+$/.test(backup.ciphertext) || backup.ciphertext.length % 2 || backup.ciphertext.length < 144 || backup.ciphertext.length > 2048
    || (backup.version === 1 && backup.ciphertext.length !== 144)) throw new Error('El respaldo de esta wallet no es válido.');
  return bytesToHex(sha256(bytes(JSON.stringify([userId, publicKey, backup.version, backup.salt, backup.nonce, backup.ciphertext]))));
}
export async function decryptRecovery(backup: WalletBackup, credential: BackupCredential, userId: string, publicKey: string): Promise<RecoveryMaterial> {
  fingerprintBackup(backup, userId, publicKey);
  const passwordBytes = bytes(passwordOf(credential));
  let key: Uint8Array | undefined; let derived: AccountKeys | undefined;
  let plaintext: Uint8Array | undefined;
  try {
    if (backup.version === 3) {
      const given = typeof credential === 'string' ? undefined : credential.keys;
      if (given && given.salt === backup.salt) key = given.backupKey;
      else { derived = await deriveAccountKeys(passwordOf(credential), backup.salt); key = derived.backupKey; }
    } else key = await deriveBackupKey(passwordBytes, hexToBytes(backup.salt));
    plaintext = gcm(key, hexToBytes(backup.nonce), aad(backup.version, userId, publicKey)).decrypt(hexToBytes(backup.ciphertext));
    const text = Buffer.from(plaintext).toString('utf8');
    const payload: unknown = backup.version === 1 ? { secret: text } : JSON.parse(text);
    if (!payload || typeof payload !== 'object' || typeof (payload as RecoveryMaterial).secret !== 'string') throw new Error('Respaldo inválido.');
    const material = payload as RecoveryMaterial;
    if (material.mnemonic !== undefined && typeof material.mnemonic !== 'string') throw new Error('Frase inválida.');
    if (material.accountId !== undefined && (backup.version !== 3 || typeof material.accountId !== 'string')) throw new Error('Cuenta inválida.');
    if (validateRecoveryMaterial(material) !== publicKey) throw new Error('Wallet diferente.');
    return { secret: material.secret, ...(material.mnemonic ? { mnemonic: material.mnemonic } : {}), ...(material.accountId ? { accountId: material.accountId } : {}) };
  } catch { throw new BackupDecryptError(); }
  finally {
    // Only wipe keys derived here; caller-provided keys stay usable.
    if (backup.version !== 3) key?.fill(0);
    wipeKeys(derived);
    plaintext?.fill(0); passwordBytes.fill(0);
  }
}
export async function decryptWallet(backup: WalletBackup, password: string, userId: string, publicKey: string) {
  return (await decryptRecovery(backup, password, userId, publicKey)).secret;
}
