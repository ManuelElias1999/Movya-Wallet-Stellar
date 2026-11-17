// Account vs signer model for key rotation on Stellar.
//
//   accountId        the Stellar account that holds the funds (never changes)
//   device signer    the key on this phone, weight 1
//   recovery signer  a key derived from a separate 12-word recovery kit that
//                    is written on paper and never stored on the phone or in
//                    Supabase, weight 2
//   thresholds       low 1, medium 1, high 2
//
// The phone can pay and swap (medium = 1) but cannot add or remove signers
// (high = 2). Only the recovery kit can, so after a theft the owner can
// disable the stolen key from another device. Limitation: a thief with the
// unlocked phone and its biometrics could still pay out the balance before
// the owner reacts; rotation stops further use, it does not undo payments.
// Pure helpers over Horizon's account record; transactions live in signerTransactions.ts.
import type { TestnetAccount } from './payments';
import { DEVICE_SIGNER_WEIGHT, RECOVERY_SIGNER_WEIGHT, THRESHOLDS } from './signingPolicy';

export const DEVICE_PATH = "m/44'/148'/0'";

export function signerWeight(account: TestnetAccount, publicKey: string): number {
  const signer = account.signers?.find(entry => entry.key === publicKey && entry.type === 'ed25519_public_key');
  // Horizon always lists the master key; older records without signers mean
  // an untouched account where the master key alone signs.
  if (!account.signers) return publicKey === account.account_id ? 1 : 0;
  return signer?.weight ?? 0;
}
export function thresholds(account: TestnetAccount) {
  const t = account.thresholds;
  return { low: t?.low_threshold ?? 0, medium: t?.med_threshold ?? 0, high: t?.high_threshold ?? 0 };
}

export type RecoveryState =
  | { kind: 'unprotected' }                           // no recovery signer yet
  | { kind: 'protected'; recoverySigners: string[] }  // expected configuration
  | { kind: 'unexpected' };                           // signers/thresholds Movya did not set

export function recoveryState(account: TestnetAccount, deviceSigner: string): RecoveryState {
  const others = (account.signers ?? []).filter(entry => entry.key !== deviceSigner && entry.weight > 0);
  const t = thresholds(account);
  if (!others.length && signerWeight(account, deviceSigner) > 0 && t.high <= signerWeight(account, deviceSigner)) return { kind: 'unprotected' };
  const recovery = others.filter(entry => entry.type === 'ed25519_public_key' && entry.weight === RECOVERY_SIGNER_WEIGHT);
  if (recovery.length === others.length && recovery.length >= 1 && signerWeight(account, deviceSigner) === DEVICE_SIGNER_WEIGHT
    && t.low === THRESHOLDS.low && t.medium === THRESHOLDS.medium && t.high === THRESHOLDS.high) {
    return { kind: 'protected', recoverySigners: recovery.map(entry => entry.key) };
  }
  return { kind: 'unexpected' };
}

// Called before every signature: a key that was rotated out (weight 0) or
// that cannot meet the payment threshold must not be used.
export function assertDeviceCanSign(account: TestnetAccount, deviceSigner: string) {
  const weight = signerWeight(account, deviceSigner);
  if (weight <= 0) throw new Error('Este dispositivo fue desactivado para tu cuenta. Recupera el acceso con tu kit de recuperación.');
  if (weight < Math.max(1, thresholds(account).medium)) throw new Error('La clave de este dispositivo no tiene permiso para enviar desde esta cuenta.');
}

// Validates the account state a rotation will act on: the recovery key must
// hold enough weight to change signers on its own.
export function assertRecoveryCanRotate(account: TestnetAccount, recoverySigner: string) {
  const weight = signerWeight(account, recoverySigner);
  if (weight <= 0) throw new Error('Ese kit de recuperación no está registrado en esta cuenta.');
  if (weight < thresholds(account).high) throw new Error('El kit de recuperación no tiene permiso suficiente para cambiar las claves.');
}

// Keys the rotation must disable: every positive-weight signer other than the
// recovery kit(s) and the new device key.
export function signersToRevoke(account: TestnetAccount, recoverySigner: string, newDevice: string) {
  return (account.signers ?? [{ key: account.account_id, weight: 1, type: 'ed25519_public_key' }])
    .filter(entry => entry.weight > 0 && entry.key !== recoverySigner && entry.key !== newDevice)
    .map(entry => ({ key: entry.key, master: entry.key === account.account_id }));
}
