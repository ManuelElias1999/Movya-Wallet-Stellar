import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { backendConfigured, bindAccessSignal, requireBackend, supabase } from '@/services/backend/client';
import { restoreWithWords as restoreWalletWithWords, signInSecure, signUpSecure, unlockUserWallet } from '@/services/backend/accounts';
import type { AccountKeys } from '@/services/backend/accountKeys';
import { assertPasswordNotLeaked } from '@/services/backend/passwordPolicy';
import { readWallet, readWalletMeta, clearWalletOnLogout, updateWalletMeta } from '@/services/backend/storage';
import { revealRecovery } from '@/services/backend/revealRecovery';
import type { RecoveryMaterial } from '@/services/stellar/recovery';
import { assertAccessActive, withAccessDeadline } from '@/services/backend/accessOperation';
import type { RecoveryProgress } from '@/services/backend/walletRecovery';
import { accessSteps } from '@/services/backend/accessFlow';
import { lockDecision } from '@/services/security/appLock';

type Auth = {
  configured: boolean; initialized: boolean; user: User | null; ready: boolean; error: string; needsBackup: boolean;
  accessStage: string; cancelAccess: () => void; needsOnboarding: boolean; finishOnboarding: () => void;
  // Locked: signed in, but the wallet stays closed until biometrics or the password.
  locked: boolean; deviceUnlockAvailable: boolean; unlockWithDevice: () => Promise<void>; lockNow: () => void; touch: () => void;
  // The sign-in worked but the backup did not open (for example after a
  // password reset): restore with the wallet's 12 words or the recovery kit.
  needsRestore: boolean; restoreWithWords: (password: string, words: string) => Promise<'restored' | 'rotated'>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  verifyEmail: (email: string, token: string, password: string) => Promise<void>;
  resendEmail: (email: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  readRecovery: (password: string) => Promise<RecoveryMaterial>;
  acknowledgeBackup: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
const isDecryptFailure = (error: unknown) => Boolean((error as { backupDecrypt?: boolean } | null)?.backupDecrypt);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [needsBackup, setNeedsBackup] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [accessStage, setAccessStage] = useState('');
  const [locked, setLocked] = useState(false);
  const [deviceUnlockAvailable, setDeviceUnlockAvailable] = useState(false);
  const [needsRestore, setNeedsRestore] = useState(false);
  const accessController = useRef<AbortController | null>(null);
  const operation = useRef(false);
  const revision = useRef(0);
  const sessionOwner = useRef<string | null>(null);
  const lastActive = useRef(Date.now());
  const backgroundAt = useRef<number | null>(null);
  const readyRef = useRef(false);
  readyRef.current = ready;

  useEffect(() => {
    if (!supabase) { setInitialized(true); return; }
    let active = true;
    const subscription = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (sessionOwner.current !== (next?.user.id ?? null)) { revision.current++; setReady(false); }
      sessionOwner.current = next?.user.id ?? null;
      setSession(next);
      if (!next) { setReady(false); setLocked(false); }
    }).data.subscription;
    void (async () => {
      const result = await supabase.auth.getSession();
      if (result.error) throw result.error;
      if (result.data.session) {
        const validated = await supabase.auth.getUser();
        if (validated.error) throw validated.error;
        const meta = await readWalletMeta(validated.data.user.id);
        // A restored session never opens the wallet by itself: biometrics or
        // the password are required on every cold start.
        if (active) {
          setSession(result.data.session); setNeedsBackup(false); setNeedsOnboarding(false); setReady(false);
          setLocked(Boolean(meta)); setDeviceUnlockAvailable(meta?.protection === 'biometric');
        }
      }
    })().catch(() => { if (active) { setError('No pudimos recuperar tu sesión. Vuelve a ingresar.'); setSession(null); setReady(false); } })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  // ---- automatic lock --------------------------------------------------
  const lockNow = useCallback(() => {
    if (!readyRef.current || operation.current) return;
    setReady(false); setLocked(true);
  }, []);
  const touch = useCallback(() => { lastActive.current = Date.now(); }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      const decision = lockDecision({ state, now: Date.now(), backgroundAt: backgroundAt.current, lastActive: lastActive.current });
      backgroundAt.current = decision.backgroundAt;
      if (decision.lock) lockNow();
      if (state === 'active') lastActive.current = Date.now();
    });
    const timer = setInterval(() => {
      if (lockDecision({ state: 'active', now: Date.now(), backgroundAt: null, lastActive: lastActive.current }).lock) lockNow();
    }, 15_000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, [lockNow]);

  const runAccess = async <T,>(work: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    if (operation.current) throw new Error('Espera a que termine el acceso a tu wallet.');
    const controller = new AbortController();
    accessController.current = controller; operation.current = true;
    setAccessStage('Verificando tu cuenta…');
    const unbind = bindAccessSignal(controller.signal);
    try { return await withAccessDeadline(work, controller); }
    finally { unbind(); if (accessController.current === controller) { accessController.current = null; operation.current = false; setAccessStage(''); } }
  };
  const cancelAccess = () => accessController.current?.abort(new Error('Se canceló el acceso. Tu cuenta se conserva; vuelve a ingresar con la misma contraseña.'));
  useEffect(() => () => { accessController.current?.abort(); }, []);

  const opened = (backupAcknowledged: boolean, newAccount: boolean, protection: boolean) => {
    const steps = accessSteps(newAccount, backupAcknowledged);
    setNeedsBackup(steps.needsBackup); setNeedsOnboarding(steps.needsOnboarding);
    setLocked(false); setNeedsRestore(false); setDeviceUnlockAvailable(protection);
    lastActive.current = Date.now();
    setReady(true);
  };

  const complete = async (next: Session, password: string, signal: AbortSignal, credentials: { keys?: AccountKeys; legacy?: boolean }, newAccount = false) => {
    assertAccessActive(signal);
    const current = revision.current;
    setReady(false); setSession(next); setError('');
    const stages: Record<RecoveryProgress, string> = {
      reading: 'Buscando el respaldo de tu wallet…', creating: 'Preparando tu wallet…',
      encrypting: 'Cifrando tu respaldo por primera vez. En este dispositivo puede tardar; no cierres la app…', registering: 'Guardando tu respaldo cifrado…',
      decrypting: 'Abriendo tu respaldo. Esto puede tardar un momento…', local: 'Abriendo la wallet guardada en tu teléfono…', saving: 'Guardando tu wallet en este dispositivo…',
    };
    try {
      const local = await unlockUserWallet(next.user.id, password, { signal, onProgress: stage => setAccessStage(stages[stage]), ...credentials });
      assertAccessActive(signal);
      if (current !== revision.current) throw new Error('La sesión cambió. Vuelve a ingresar.');
      const meta = await readWalletMeta(next.user.id);
      opened(Boolean(local.backupAcknowledged), newAccount, meta?.protection === 'biometric');
    } catch (failure) {
      if (isDecryptFailure(failure)) {
        setNeedsRestore(true);
        throw new Error('Ingresaste a tu cuenta, pero tu respaldo está cifrado con otra contraseña. Restáuralo con tus 12 palabras o tu kit de recuperación.');
      }
      throw failure;
    } finally { credentials.keys?.backupKey.fill(0); }
  };
  const login = async (email: string, password: string) => {
    await runAccess(async signal => {
      const signed = await signInSecure(email, password);
      await complete(signed.session, password, signal, signed);
    });
  };
  const register = async (email: string, password: string, name: string) => {
    if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
    await assertPasswordNotLeaked(password);
    return runAccess(async signal => {
      const result = await signUpSecure(email, password, name.trim());
      assertAccessActive(signal);
      if (!result.session) { result.keys.backupKey.fill(0); return false; }
      await complete(result.session, password, signal, { keys: result.keys }, true);
      return true;
    });
  };
  const verifyEmail = async (email: string, token: string, password: string) => {
    await runAccess(async signal => {
      const db = requireBackend();
      const verified = await db.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'signup' });
      if (verified.error) throw verified.error;
      assertAccessActive(signal);
      // Verify the password too before encrypting a new wallet with it.
      const signed = await signInSecure(email, password);
      await complete(signed.session, password, signal, signed, true);
    });
  };
  const resendEmail = async (email: string) => {
    const result = await requireBackend().auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    if (result.error) throw result.error;
  };
  const unlock = async (password: string) => {
    if (!session?.user.email) throw new Error('Ingresa con tu correo para abrir tu wallet.');
    const email = session.user.email;
    await runAccess(async signal => {
      const signed = await signInSecure(email, password);
      await complete(signed.session, password, signal, signed);
    });
  };
  const unlockWithDevice = async () => {
    if (!session) throw new Error('Ingresa con tu correo para abrir tu wallet.');
    if (operation.current) throw new Error('Espera a que termine el acceso a tu wallet.');
    const owner = session.user.id; const current = revision.current;
    operation.current = true;
    try {
      const meta = await readWalletMeta(owner);
      if (!meta || meta.protection !== 'biometric') throw new Error('Ingresa tu contraseña para abrir tu wallet.');
      // Reading the protected key is what shows Face ID / Touch ID / fingerprint.
      const wallet = await readWallet(owner).catch(() => null);
      if (!wallet) throw new Error('No se confirmó tu identidad. Inténtalo de nuevo o usa tu contraseña.');
      if (current !== revision.current || sessionOwner.current !== owner) throw new Error('La sesión cambió. Vuelve a ingresar.');
      opened(Boolean(meta.backupAcknowledged), false, true);
    } finally { operation.current = false; }
  };
  const restoreWithWords = async (password: string, words: string) => {
    if (!session?.user.email) throw new Error('Ingresa con tu correo antes de restaurar.');
    const email = session.user.email;
    return runAccess(async signal => {
      setAccessStage('Verificando tu cuenta…');
      const signed = await signInSecure(email, password);
      signed.keys?.backupKey.fill(0);
      assertAccessActive(signal);
      setSession(signed.session);
      setAccessStage('Restaurando tu wallet…');
      const result = await restoreWalletWithWords(signed.session.user.id, password, words);
      assertAccessActive(signal);
      const meta = await readWalletMeta(signed.session.user.id);
      opened(Boolean(result.wallet.backupAcknowledged), false, meta?.protection === 'biometric');
      // A rotation creates new device words: ask the person to save them.
      if (result.kind === 'rotated') setNeedsBackup(true);
      return result.kind;
    });
  };
  const logout = async () => {
    if (operation.current) throw new Error('Espera a que termine el acceso a tu wallet.');
    const id = session?.user.id;
    revision.current++; setReady(false); setLocked(false); setNeedsRestore(false); setNeedsBackup(false); setNeedsOnboarding(false); setSession(null); sessionOwner.current = null;
    // Keep the native per-user wallet protected; all routes/signing stay locked.
    // Web private keys leave memory, and auth tokens are removed on both platforms.
    try { if (id) await clearWalletOnLogout(id); }
    finally {
      const result = await requireBackend().auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
    }
  };
  const readRecovery = async (password: string) => {
    if (!session || !ready || operation.current) throw new Error('Abre tu wallet antes de ver el respaldo.');
    operation.current = true;
    const owner = session.user.id; const current = revision.current;
    try {
      return await revealRecovery({
        owner, password, stillCurrent: () => current === revision.current && sessionOwner.current === owner,
        authenticate: async candidate => {
          try {
            const signed = await signInSecure(session.user.email!, candidate);
            signed.keys?.backupKey.fill(0);
            return signed.session.user.id;
          } catch { throw new Error('La contraseña no es correcta o no pudimos verificarla.'); }
        },
        // Password AND biometrics: reading the key shows the system prompt.
        read: () => readWallet(owner),
      });
    } finally { operation.current = false; }
  };
  const acknowledgeBackup = async () => {
    if (!session || !ready || operation.current) throw new Error('Espera a que termine la verificación.');
    operation.current = true;
    try {
      const current = revision.current; const owner = session.user.id;
      await updateWalletMeta({ backupAcknowledged: true }, owner);
      if (current !== revision.current) throw new Error('La sesión cambió. Vuelve a ingresar.');
      setNeedsBackup(false);
    } finally { operation.current = false; }
  };
  return <Context.Provider value={{ configured: backendConfigured, initialized, user: session?.user ?? null, ready, error, needsBackup, needsOnboarding, finishOnboarding: () => setNeedsOnboarding(false), accessStage, cancelAccess, locked, deviceUnlockAvailable, unlockWithDevice, lockNow, touch, needsRestore, restoreWithWords, login, register, verifyEmail, resendEmail, unlock, logout, readRecovery, acknowledgeBackup }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider no disponible.');
  return value;
}
