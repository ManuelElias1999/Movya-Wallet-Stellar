import { Keypair } from '@stellar/stellar-sdk/base';
import { Platform } from 'react-native';
import { requireBackend } from './client';
import { assertKdfSalt, deriveAccountKeys, newKdfSalt, wipeKeys, type AccountKeys } from './accountKeys';
import { rememberContactsKey } from './contactBackup';
import { completeSecondFactor, MfaRequiredError, needsSecondFactor } from './mfa';
import { clearPendingSweep, readPendingSweep, readWallet, updateWalletMeta, writeWallet, type StoredWallet } from './storage';
import { decryptRecovery, encryptRecoveryV3, fingerprintBackup, type WalletBackup } from './vault';
import { recoverWallet, type RecoveryProgress, type WalletRecord } from './walletRecovery';
import { createRecoveryWallet, validateRecoveryMaterial, walletFromMnemonic, type RecoveryMaterial } from '../stellar/recovery';
import { readTestnetAccount } from '../stellar/payments';
import { recoveryState, signerWeight } from '../stellar/signers';
import { rotateDeviceKey } from '../stellar/signerTransactions';

type BackupRow = WalletRecord & { pending_backup: WalletBackup | null };
const db = () => requireBackend();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function invalidCredentials(error: { code?: string; status?: number; message?: string }) {
  return error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message ?? '');
}

// ---------------------------------------------------------------------------
// Sign-in: v3 first (derived login secret), then the legacy typed password.
// Accounts still on the legacy scheme are upgraded after the wallet opens.
// ---------------------------------------------------------------------------
export async function loginParams(email: string) {
  const result = await db().rpc('movya_login_params', { login_email: normalizeEmail(email) });
  if (result.error) throw result.error;
  const salt = (result.data as { salt?: string } | null)?.salt ?? '';
  assertKdfSalt(salt);
  return salt;
}
// With two-step verification enabled, the 6-digit code is required before
// the wallet opens; without it this throws MfaRequiredError (the caller asks
// for the code and signs in again).
async function secondFactor(mfaCode?: string) {
  if (!await needsSecondFactor()) return;
  if (!mfaCode) throw new MfaRequiredError();
  await completeSecondFactor(mfaCode);
}
async function currentSession<T>(fallback: T) {
  return (await db().auth.getSession()).data.session ?? fallback;
}
export async function signInSecure(email: string, password: string, mfaCode?: string) {
  const address = normalizeEmail(email);
  const keys = await deriveAccountKeys(password, await loginParams(address));
  const v3 = await db().auth.signInWithPassword({ email: address, password: keys.loginSecret });
  if (!v3.error) {
    try { await secondFactor(mfaCode); } catch (error) { wipeKeys(keys); throw error; }
    return { session: await currentSession(v3.data.session), keys, legacy: false as const };
  }
  wipeKeys(keys);
  if (!invalidCredentials(v3.error)) throw v3.error;
  const legacy = await db().auth.signInWithPassword({ email: address, password });
  if (legacy.error) throw invalidCredentials(legacy.error) ? new Error('Correo o contraseña incorrectos.') : legacy.error;
  await secondFactor(mfaCode);
  return { session: await currentSession(legacy.data.session), keys: undefined, legacy: true as const };
}
export async function signUpSecure(email: string, password: string, displayName: string) {
  const salt = newKdfSalt();
  const keys = await deriveAccountKeys(password, salt);
  const result = await db().auth.signUp({ email: normalizeEmail(email), password: keys.loginSecret, options: { data: { display_name: displayName, movya_kdf_salt: salt } } });
  if (result.error) { wipeKeys(keys); throw result.error; }
  return { session: result.data.session, keys };
}

// ---------------------------------------------------------------------------
// Two-phase backup replacement: stage → download → prove it decrypts with the
// typed password → promote. The typed password always opens the active
// backup, whatever Supabase Auth currently stores, so no step can lock the
// person out.
// ---------------------------------------------------------------------------
async function readBackupRow(userId: string) {
  const result = await db().from('wallet_backups').select('owner_id, public_key, backup, pending_backup').eq('owner_id', userId).maybeSingle();
  if (result.error) throw result.error;
  return result.data as BackupRow | null;
}
async function stageVerified(userId: string, password: string, keys: AccountKeys, material: RecoveryMaterial, accountId: string) {
  if (validateRecoveryMaterial(material) !== accountId) throw new Error('El respaldo nuevo no corresponde a tu cuenta.');
  const staged = await db().rpc('stage_wallet_backup', { new_backup: encryptRecoveryV3(material, keys, userId) });
  if (staged.error) throw staged.error;
  const row = await readBackupRow(userId);
  if (!row?.pending_backup || row.public_key !== accountId) throw new Error('No pudimos verificar el respaldo nuevo.');
  const check = await decryptRecovery(row.pending_backup, { password, keys }, userId, accountId);
  if (check.secret !== material.secret) throw new Error('El respaldo nuevo no se pudo verificar.');
  return row.pending_backup;
}
async function promote(verified: WalletBackup) {
  const result = await db().rpc('promote_wallet_backup', { verified_backup: verified });
  if (result.error) throw result.error;
}
async function discardPending() { await db().rpc('discard_pending_wallet_backup'); }
async function claimSalt() {
  const result = await db().rpc('claim_kdf_salt', { candidate: newKdfSalt() });
  if (result.error) throw result.error;
  assertKdfSalt(result.data as string);
  return result.data as string;
}
// Re-encrypts the wallet as v3 and switches Supabase Auth to the derived
// login secret. Used to upgrade legacy accounts and after restoring with words.
async function rekey(userId: string, password: string, material: RecoveryMaterial, accountId: string) {
  const keys = await deriveAccountKeys(password, await claimSalt());
  try {
    await promote(await stageVerified(userId, password, keys, material, accountId));
    const updated = await db().auth.updateUser({ password: keys.loginSecret });
    if (updated.error) throw updated.error;
    await rememberContactsKey(userId, keys.contactsKey);
  } finally { wipeKeys(keys); }
}

// A staged backup left by an interrupted rotation or upgrade is finished
// (promoted) only if it decrypts and holds a key that is active on-chain.
async function finishPending(userId: string, password: string, keys: AccountKeys | undefined, row: BackupRow, current: RecoveryMaterial) {
  if (!row.pending_backup) return current;
  let pending: RecoveryMaterial;
  try { pending = await decryptRecovery(row.pending_backup, { password, keys }, userId, row.public_key); }
  catch { await discardPending().catch(() => undefined); return current; }
  const pendingSigner = Keypair.fromSecret(pending.secret).publicKey(), currentSigner = Keypair.fromSecret(current.secret).publicKey();
  let usePending = pendingSigner === currentSigner && row.pending_backup.version > row.backup.version;
  if (pendingSigner !== currentSigner) {
    const account = await readTestnetAccount(row.public_key).catch(() => null);
    usePending = Boolean(account && signerWeight(account, pendingSigner) > 0 && signerWeight(account, currentSigner) === 0);
  }
  if (!usePending) { await discardPending().catch(() => undefined); return current; }
  await promote(row.pending_backup);
  return pending;
}

// ---------------------------------------------------------------------------
// Opening the wallet after a successful sign-in.
// ---------------------------------------------------------------------------
export async function unlockUserWallet(userId: string, password: string, options: { signal?: AbortSignal; onProgress?: (stage: RecoveryProgress) => void; keys?: AccountKeys; legacy?: boolean } = {}) {
  let opened: StoredWallet | null = null;
  await recoverWallet({
    getBackup: async () => readBackupRow(userId),
    register: async (publicKey, backup) => {
      const result = await db().rpc('register_wallet', { wallet_public_key: publicKey, wallet_backup: backup });
      if (result.error) throw result.error;
      return result.data as WalletRecord;
    },
    // The local key sits behind biometrics; if the prompt is dismissed or the
    // biometric set changed, fall back to the encrypted backup.
    readLocal: async owner => { try { return await readWallet(owner); } catch { return null; } },
    writeLocal: async (wallet, owner) => { await writeWallet(wallet, owner); opened = wallet; },
  }, userId, password, false, { signal: options.signal, onProgress: options.onProgress, keys: options.keys, allowLocalCache: Platform.OS !== 'web' });
  if (!opened) throw new Error('No pudimos abrir tu wallet. Vuelve a intentarlo.');
  let wallet: StoredWallet = opened;
  let row = await readBackupRow(userId);
  if (!row) return wallet;
  const material = await finishPending(userId, password, options.keys, row, wallet);
  if (material.secret !== wallet.secret) {
    // An interrupted rotation finished: this device now holds the new key,
    // whose words the person still has to save.
    wallet = { ...wallet, secret: material.secret, mnemonic: material.mnemonic, accountId: material.accountId, backupAcknowledged: false };
    await writeWallet(wallet, userId);
  }
  row = await readBackupRow(userId) ?? row;
  // Legacy accounts move to v3 now that the typed password is known to work.
  if (options.legacy || row.backup.version < 3) {
    await rekey(userId, password, material, row.public_key).catch(() => undefined); // retried next sign-in
    row = await readBackupRow(userId) ?? row;
  }
  const fingerprint = fingerprintBackup(row.backup, userId, row.public_key);
  if (fingerprint !== wallet.backupFingerprint) {
    // Metadata only: rewriting the key would show another biometric prompt.
    wallet = { ...wallet, backupFingerprint: fingerprint };
    await updateWalletMeta({ backupFingerprint: fingerprint }, userId);
  }
  // An emergency transfer interrupted before the account switched is finished now.
  return finishPendingSweep(userId, password, wallet).catch(() => wallet);
}

// ---------------------------------------------------------------------------
// Restore with 12 words: either the wallet's own words (for example after a
// password reset made the old backup unreadable) or the recovery kit, which
// rotates in a new device key and disables the old one.
// ---------------------------------------------------------------------------
export type WordsRestoreResult = { kind: 'restored' | 'rotated'; wallet: StoredWallet };
export async function restoreWithWords(userId: string, password: string, words: string): Promise<WordsRestoreResult> {
  if (password.length < 12) throw new Error('Usa tu contraseña actual de al menos 12 caracteres.');
  const row = await readBackupRow(userId);
  if (!row) throw new Error('Tu cuenta todavía no tiene una wallet para restaurar.');
  const fromWords = walletFromMnemonic(words);
  const wordsKey = Keypair.fromSecret(fromWords.secret);
  const account = await readTestnetAccount(row.public_key).catch((error: { status?: number }) => { if (error.status === 404) return null; throw error; });

  let material: RecoveryMaterial; let kind: WordsRestoreResult['kind'] = 'restored';
  if (!account) {
    if (wordsKey.publicKey() !== row.public_key) throw new Error('Estas palabras no corresponden a tu wallet.');
    material = fromWords;
  } else {
    const weight = signerWeight(account, wordsKey.publicKey());
    if (weight <= 0) throw new Error('Estas palabras no controlan tu cuenta. Revisa el orden o usa tu kit de recuperación.');
    const state = recoveryState(account, wordsKey.publicKey());
    const isKit = wordsKey.publicKey() !== row.public_key && weight >= (account.thresholds?.high_threshold ?? 0) && (account.thresholds?.high_threshold ?? 0) > 1 && state.kind !== 'unexpected';
    if (isKit) {
      // New device key: stage its backup first, then rotate on-chain, then
      // promote. If the rotation fails, nothing changes and the stage is discarded.
      const device = createRecoveryWallet();
      material = { ...device, accountId: row.public_key };
      const keys = await deriveAccountKeys(password, await claimSalt());
      try {
        const staged = await stageVerified(userId, password, keys, material, row.public_key);
        try { await rotateDeviceKey(row.public_key, wordsKey, Keypair.fromSecret(device.secret).publicKey()); }
        catch (error) { await discardPending().catch(() => undefined); throw error; }
        await promote(staged);
        const updated = await db().auth.updateUser({ password: keys.loginSecret });
        if (updated.error) throw updated.error;
        await rememberContactsKey(userId, keys.contactsKey);
      } finally { wipeKeys(keys); }
      kind = 'rotated';
    } else {
      material = { ...fromWords, ...(wordsKey.publicKey() !== row.public_key ? { accountId: row.public_key } : {}) };
      await rekey(userId, password, material, row.public_key);
    }
  }
  const fresh = await readBackupRow(userId);
  const wallet: StoredWallet = {
    ...material, oualiAddress: '', backupAcknowledged: kind === 'restored',
    ...(fresh ? { backupFingerprint: fingerprintBackup(fresh.backup, userId, fresh.public_key) } : {}),
  };
  await writeWallet(wallet, userId);
  return { kind, wallet };
}

// ---------------------------------------------------------------------------
// Email discovery preference.
// ---------------------------------------------------------------------------
export async function readDiscoverable(userId: string) {
  const result = await db().from('profiles').select('discoverable').eq('id', userId).maybeSingle();
  if (result.error) throw result.error;
  return (result.data as { discoverable?: boolean } | null)?.discoverable ?? true;
}
export async function setDiscoverable(_userId: string, discoverable: boolean) {
  const result = await db().rpc('set_discoverable', { value: discoverable });
  if (result.error) throw result.error;
  return result.data as boolean;
}

// Proves the password without creating a new session (so it works with
// two-step verification): only the right password opens the backup.
export async function verifyPasswordOffline(userId: string, password: string) {
  const row = await readBackupRow(userId);
  if (!row) throw new Error('Tu cuenta todavía no tiene una wallet.');
  await decryptRecovery(row.backup, password, userId, row.public_key);
}

// ---------------------------------------------------------------------------
// Emergency transfer: after the funds moved on-chain to a new wallet, the
// account points to it. A transfer interrupted before this step is finished
// at the next sign-in (the new wallet waits, protected, on this device).
// ---------------------------------------------------------------------------
export async function moveAccountToNewWallet(userId: string, password: string, fresh: RecoveryMaterial, from: string) {
  const row = await readBackupRow(userId);
  if (!row || row.public_key !== from) throw new Error('Tu cuenta ya no apunta a la wallet anterior.');
  const to = validateRecoveryMaterial(fresh);
  await verifyPasswordOffline(userId, password);
  const keys = await deriveAccountKeys(password, await claimSalt());
  try {
    const result = await db().rpc('replace_wallet_account', { old_public_key: from, new_public_key: to, new_backup: encryptRecoveryV3(fresh, keys, userId) });
    if (result.error) throw result.error;
    const updated = await db().auth.updateUser({ password: keys.loginSecret });
    if (updated.error) throw updated.error;
    await rememberContactsKey(userId, keys.contactsKey);
  } finally { wipeKeys(keys); }
  const fresh_ = await readBackupRow(userId);
  const wallet: StoredWallet = { ...fresh, oualiAddress: '', backupAcknowledged: false, ...(fresh_ ? { backupFingerprint: fingerprintBackup(fresh_.backup, userId, fresh_.public_key) } : {}) };
  await writeWallet(wallet, userId);
  await clearPendingSweep(userId);
  return wallet;
}
async function finishPendingSweep(userId: string, password: string, current: StoredWallet) {
  const pending = await readPendingSweep(userId).catch(() => null);
  if (!pending) return current;
  const to = Keypair.fromSecret(pending.secret).publicKey();
  const funded = await readTestnetAccount(to).then(() => true, () => false);
  const row = await readBackupRow(userId);
  if (!funded || !row) return current;                      // transfer never happened: keep waiting
  if (row.public_key === to) { await clearPendingSweep(userId); return current; }
  if (row.public_key !== pending.from) return current;
  return moveAccountToNewWallet(userId, password, { secret: pending.secret, mnemonic: pending.mnemonic }, pending.from);
}
