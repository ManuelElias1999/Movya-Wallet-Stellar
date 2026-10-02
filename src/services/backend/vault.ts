import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils.js';
import { Buffer } from 'buffer';
import { Keypair } from '@stellar/stellar-sdk/base';

// Versioned, bounded parameters: never trust KDF costs read from the server.
const ITERATIONS = 600_000;
export type WalletBackup = { version: 1; salt: string; nonce: string; ciphertext: string };
const aad = (userId: string, publicKey: string) => Uint8Array.from(Buffer.from(`movya:testnet:v1:${userId}:${publicKey}`, 'utf8'));

export async function encryptWallet(secret: string, password: string, userId: string): Promise<WalletBackup> {
  if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
  const publicKey = Keypair.fromSecret(secret).publicKey();
  const salt = randomBytes(16); const nonce = randomBytes(12);
  const passwordBytes = Uint8Array.from(Buffer.from(password, 'utf8'));
  const key = await pbkdf2Async(sha256, passwordBytes, salt, { c: ITERATIONS, dkLen: 32 });
  const plaintext = Uint8Array.from(Buffer.from(secret, 'utf8'));
  try { return { version: 1, salt: bytesToHex(salt), nonce: bytesToHex(nonce), ciphertext: bytesToHex(gcm(key, nonce, aad(userId, publicKey)).encrypt(plaintext)) }; }
  finally { key.fill(0); plaintext.fill(0); passwordBytes.fill(0); }
}

export async function decryptWallet(backup: WalletBackup, password: string, userId: string, publicKey: string): Promise<string> {
  if (backup?.version !== 1 || !/^[a-f0-9]{32}$/.test(backup.salt) || !/^[a-f0-9]{24}$/.test(backup.nonce) || !/^[a-f0-9]{144}$/.test(backup.ciphertext)) throw new Error('El respaldo de esta wallet no es válido.');
  const passwordBytes = Uint8Array.from(Buffer.from(password, 'utf8'));
  const key = await pbkdf2Async(sha256, passwordBytes, hexToBytes(backup.salt), { c: ITERATIONS, dkLen: 32 });
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = gcm(key, hexToBytes(backup.nonce), aad(userId, publicKey)).decrypt(hexToBytes(backup.ciphertext));
    const secret = String.fromCharCode(...plaintext);
    if (Keypair.fromSecret(secret).publicKey() !== publicKey) throw new Error('Wallet diferente.');
    return secret;
  } catch { throw new Error('No se pudo abrir tu wallet. Usa la contraseña con la que la creaste. No crearemos otra encima de ella.'); }
  finally { key.fill(0); plaintext?.fill(0); passwordBytes.fill(0); }
}
