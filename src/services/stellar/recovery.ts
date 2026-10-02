import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { Keypair } from '@stellar/stellar-sdk/base';
import { HDKey } from 'micro-key-producer/slip10.js';

export const STELLAR_RECOVERY_PATH = "m/44'/148'/0'";
export type RecoveryMaterial = { secret: string; mnemonic?: string };

export function walletFromMnemonic(input: string): RecoveryMaterial & { mnemonic: string } {
  const mnemonic = input.trim().toLowerCase().split(/\s+/).join(' ');
  if (mnemonic.split(' ').length !== 12 || !validateMnemonic(mnemonic, wordlist)) throw new Error('La frase debe tener 12 palabras válidas, en el orden original.');
  // SEP-0005: BIP39 with an empty passphrase, SLIP-0010 ed25519, account 0.
  // The login password never changes the derived Stellar address.
  const seed = mnemonicToSeedSync(mnemonic, '');
  const master = HDKey.fromMasterSeed(seed);
  const child = master.derive(STELLAR_RECOVERY_PATH);
  try { return { mnemonic, secret: Keypair.fromRawEd25519Seed(child.privateKey).secret() }; }
  finally { seed.fill(0); master.privateKey.fill(0); master.chainCode.fill(0); child.privateKey.fill(0); child.chainCode.fill(0); }
}
export function createRecoveryWallet() {
  return walletFromMnemonic(generateMnemonic(wordlist, 128));
}
export function validateRecoveryMaterial(material: RecoveryMaterial) {
  const publicKey = Keypair.fromSecret(material.secret).publicKey();
  if (material.mnemonic && walletFromMnemonic(material.mnemonic).secret !== material.secret) throw new Error('La frase de recuperación no corresponde a esta wallet.');
  return publicKey;
}
