import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { backendConfigured, bindAccessSignal, requireBackend, supabase } from '@/services/backend/client';
import { unlockUserWallet } from '@/services/backend/accounts';
import { readWallet, clearWalletOnLogout, writeWallet } from '@/services/backend/storage';
import { revealRecovery } from '@/services/backend/revealRecovery';
import type { RecoveryMaterial } from '@/services/stellar/recovery';
import { assertAccessActive, withAccessDeadline } from '@/services/backend/accessOperation';
import type { RecoveryProgress } from '@/services/backend/walletRecovery';
import { accessSteps } from '@/services/backend/accessFlow';

type Auth = {
  configured: boolean; initialized: boolean; user: User | null; ready: boolean; error: string; needsBackup: boolean;
  accessStage: string; cancelAccess: () => void; needsOnboarding: boolean; finishOnboarding: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [needsBackup, setNeedsBackup] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [accessStage, setAccessStage] = useState('');
  const accessController = useRef<AbortController | null>(null);
  const operation = useRef(false);
  const revision = useRef(0);
  const sessionOwner = useRef<string | null>(null);
  useEffect(() => {
    if (!supabase) { setInitialized(true); return; }
    let active = true;
    const subscription = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (sessionOwner.current !== (next?.user.id ?? null)) { revision.current++; setReady(false); }
      sessionOwner.current = next?.user.id ?? null;
      setSession(next);
      if (!next) setReady(false);
    }).data.subscription;
    void (async () => {
      const result = await supabase.auth.getSession();
      if (result.error) throw result.error;
      if (result.data.session) {
        const validated = await supabase.auth.getUser();
        if (validated.error) throw validated.error;
        const local = await readWallet(validated.data.user.id);
        if (active) { setSession(result.data.session); setNeedsBackup(false); setNeedsOnboarding(false); setReady(Boolean(local)); }
      }
    })().catch(() => { if (active) { setError('No pudimos recuperar tu sesión. Vuelve a ingresar.'); setSession(null); setReady(false); } })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

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

  const complete = async (next: Session, password: string, signal: AbortSignal, newAccount = false) => {
    assertAccessActive(signal);
    const current = revision.current;
    setReady(false); setSession(next); setError('');
    const stages: Record<RecoveryProgress, string> = {
      reading: 'Buscando el respaldo de tu wallet…', creating: 'Preparando tu wallet…',
      encrypting: 'Protegiendo tu respaldo. Esto puede tardar un momento…', registering: 'Guardando tu respaldo cifrado…',
      decrypting: 'Abriendo tu respaldo. Esto puede tardar un momento…', local: 'Abriendo la wallet guardada en tu teléfono…', saving: 'Guardando tu wallet en este dispositivo…',
    };
    const local = await unlockUserWallet(next.user.id, password, { signal, onProgress: stage => setAccessStage(stages[stage]) });
    assertAccessActive(signal);
    if (current !== revision.current) throw new Error('La sesión cambió. Vuelve a ingresar.');
    const steps = accessSteps(newAccount, Boolean(local.backupAcknowledged));
    setNeedsBackup(steps.needsBackup); setNeedsOnboarding(steps.needsOnboarding);
    setReady(true);
  };
  const login = async (email: string, password: string) => {
    await runAccess(async signal => {
      const result = await requireBackend().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (result.error) throw result.error;
      await complete(result.data.session, password, signal);
    });
  };
  const register = async (email: string, password: string, name: string) => {
    if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
    return runAccess(async signal => {
      const result = await requireBackend().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { display_name: name.trim() } } });
      if (result.error) throw result.error;
      assertAccessActive(signal);
      if (!result.data.session) return false;
      await complete(result.data.session, password, signal, true);
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
      const result = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (result.error) throw result.error;
      await complete(result.data.session, password, signal, true);
    });
  };
  const resendEmail = async (email: string) => {
    const result = await requireBackend().auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    if (result.error) throw result.error;
  };
  const unlock = async (password: string) => {
    if (!session) throw new Error('Ingresa con tu correo para abrir tu wallet.');
    await runAccess(async signal => {
      const validated = await requireBackend().auth.signInWithPassword({ email: session.user.email!, password });
      if (validated.error) throw validated.error;
      await complete(validated.data.session, password, signal);
    });
  };
  const logout = async () => {
    if (operation.current) throw new Error('Espera a que termine el acceso a tu wallet.');
    const id = session?.user.id;
    revision.current++; setReady(false); setNeedsBackup(false); setNeedsOnboarding(false); setSession(null); sessionOwner.current = null;
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
          const result = await requireBackend().auth.signInWithPassword({ email: session.user.email!, password: candidate });
          if (result.error) throw new Error('La contraseña no es correcta o no pudimos verificarla.');
          return result.data.user.id;
        },
        read: () => readWallet(owner),
      });
    } finally { operation.current = false; }
  };
  const acknowledgeBackup = async () => {
    if (!session || !ready || operation.current) throw new Error('Espera a que termine la verificación.');
    operation.current = true;
    try {
      const current = revision.current; const owner = session.user.id;
      const local = await readWallet(owner);
      if (!local || current !== revision.current) throw new Error('La sesión cambió. Vuelve a ingresar.');
      await writeWallet({ ...local, backupAcknowledged: true }, owner);
      if (current !== revision.current) throw new Error('La sesión cambió. Vuelve a ingresar.');
      setNeedsBackup(false);
    } finally { operation.current = false; }
  };
  return <Context.Provider value={{ configured: backendConfigured, initialized, user: session?.user ?? null, ready, error, needsBackup, needsOnboarding, finishOnboarding: () => setNeedsOnboarding(false), accessStage, cancelAccess, login, register, verifyEmail, resendEmail, unlock, logout, readRecovery, acknowledgeBackup }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider no disponible.');
  return value;
}
