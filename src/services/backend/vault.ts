import { gcm } from '@noble/ciphers/aes.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import { validateRecoveryMaterial, type RecoveryMaterial } from '../stellar/recovery';
import { deriveBackupKey } from './passwordKey';

export type WalletBackup = { version: 1 | 2; salt: string; nonce: string; ciphertext: string };
const bytes = (text: string) => Uint8Array.from(Buffer.from(text, 'utf8'));
const aad = (version: number, userId: string, publicKey: string) => bytes(`movya:testnet:v${version}:${userId}:${publicKey}`);

async function encrypt(material: RecoveryMaterial, version: 1 | 2, password: string, userId: string): Promise<WalletBackup> {
  if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
  const publicKey = validateRecoveryMaterial(material);
  const salt = randomBytes(16); const nonce = randomBytes(12); const passwordBytes = bytes(password);
  let key: Uint8Array | undefined; let plaintext: Uint8Array | undefined;
  try {
    key = await deriveBackupKey(passwordBytes, salt);
    // Build an explicit payload: do not serialize arbitrary local wallet fields.
    plaintext = bytes(version === 1 ? material.secret : JSON.stringify({ secret: material.secret, ...(material.mnemonic ? { mnemonic: material.mnemonic } : {}) }));
    return { version, salt: bytesToHex(salt), nonce: bytesToHex(nonce), ciphertext: bytesToHex(gcm(key, nonce, aad(version, userId, publicKey)).encrypt(plaintext)) };
  } finally { key?.fill(0); plaintext?.fill(0); passwordBytes.fill(0); }
}
export function encryptWallet(secret: string, password: string, userId: string) {
  return encrypt({ secret }, 1, password, userId);
}
export function encryptRecovery(material: RecoveryMaterial, password: string, userId: string) {
  return encrypt(material, 2, password, userId);
}
export function fingerprintBackup(backup: WalletBackup, userId: string, publicKey: string): string {
  if ((backup?.version !== 1 && backup?.version !== 2) || !/^[a-f0-9]{32}$/.test(backup.salt) || !/^[a-f0-9]{24}$/.test(backup.nonce)
    || !/^[a-f0-9]+$/.test(backup.ciphertext) || backup.ciphertext.length % 2 || backup.ciphertext.length < 144 || backup.ciphertext.length > 2048
    || (backup.version === 1 && backup.ciphertext.length !== 144)) throw new Error('El respaldo de esta wallet no es válido.');
  return bytesToHex(sha256(bytes(JSON.stringify([userId, publicKey, backup.version, backup.salt, backup.nonce, backup.ciphertext]))));
}
export async function decryptRecovery(backup: WalletBackup, password: string, userId: string, publicKey: string): Promise<RecoveryMaterial> {
  fingerprintBackup(backup, userId, publicKey);
  const passwordBytes = bytes(password);
  let key: Uint8Array | undefined;
  let plaintext: Uint8Array | undefined;
  try {
    key = await deriveBackupKey(passwordBytes, hexToBytes(backup.salt));
    plaintext = gcm(key, hexToBytes(backup.nonce), aad(backup.version, userId, publicKey)).decrypt(hexToBytes(backup.ciphertext));
    const text = Buffer.from(plaintext).toString('utf8');
    const payload: unknown = backup.version === 1 ? { secret: text } : JSON.parse(text);
    if (!payload || typeof payload !== 'object' || typeof (payload as RecoveryMaterial).secret !== 'string') throw new Error('Respaldo inválido.');
    const material = payload as RecoveryMaterial;
    if (material.mnemonic !== undefined && typeof material.mnemonic !== 'string') throw new Error('Frase inválida.');
    if (validateRecoveryMaterial(material) !== publicKey) throw new Error('Wallet diferente.');
    return { secret: material.secret, ...(material.mnemonic ? { mnemonic: material.mnemonic } : {}) };
  } catch { throw new Error('No se pudo abrir tu wallet. Usa la contraseña con la que la creaste. No crearemos otra encima de ella.'); }
  finally { key?.fill(0); plaintext?.fill(0); passwordBytes.fill(0); }
}
export async function decryptWallet(backup: WalletBackup, password: string, userId: string, publicKey: string) {
  return (await decryptRecovery(backup, password, userId, publicKey)).secret;
}
