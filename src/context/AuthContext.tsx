import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { backendConfigured, requireBackend, supabase } from '@/services/backend/client';
import { unlockUserWallet } from '@/services/backend/accounts';
import { readWallet, removeWallet } from '@/services/backend/storage';

type Auth = {
  configured: boolean; initialized: boolean; user: User | null; ready: boolean; error: string; hasLegacyWallet: boolean;
  register: (email: string, password: string, name: string, linkExisting: boolean) => Promise<boolean>;
  login: (email: string, password: string, linkExisting: boolean) => Promise<void>;
  verifyEmail: (email: string, token: string, password: string, linkExisting: boolean) => Promise<void>;
  resendEmail: (email: string) => Promise<void>;
  unlock: (password: string, linkExisting: boolean) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [hasLegacyWallet, setHasLegacyWallet] = useState(false);
  const operation = useRef(false);
  const revision = useRef(0);
  const sessionOwner = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    void readWallet().then(value => { if (active) setHasLegacyWallet(Boolean(value)); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!supabase) { setInitialized(true); return; }
    let active = true;
    const subscription = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      if (sessionOwner.current !== (next?.user.id ?? null)) setReady(false);
      sessionOwner.current = next?.user.id ?? null;
      setSession(next);
      if (!next) { revision.current++; setReady(false); }
    }).data.subscription;
    void (async () => {
      const result = await supabase.auth.getSession();
      if (result.error) throw result.error;
      if (result.data.session) {
        const validated = await supabase.auth.getUser();
        if (validated.error) throw validated.error;
        const local = await readWallet(validated.data.user.id);
        if (active) { setSession(result.data.session); setReady(Boolean(local)); }
      }
    })().catch(() => { if (active) { setError('No pudimos recuperar tu sesión. Vuelve a ingresar.'); setSession(null); setReady(false); } })
      .finally(() => { if (active) setInitialized(true); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const complete = async (next: Session, password: string, linkExisting: boolean) => {
    const current = revision.current;
    setReady(false); setSession(next); setError('');
    await unlockUserWallet(next.user.id, password, linkExisting);
    if (current !== revision.current) throw new Error('La sesión cambió. Vuelve a ingresar.');
    setReady(true);
  };
  const login = async (email: string, password: string, linkExisting: boolean) => {
    if (operation.current) return;
    operation.current = true;
    try {
      const result = await requireBackend().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (result.error) throw result.error;
      await complete(result.data.session, password, linkExisting);
    } finally { operation.current = false; }
  };
  const register = async (email: string, password: string, name: string, linkExisting: boolean) => {
    if (password.length < 12) throw new Error('Usa una contraseña de al menos 12 caracteres.');
    if (operation.current) return false;
    operation.current = true;
    try {
      const result = await requireBackend().auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { display_name: name.trim() } } });
      if (result.error) throw result.error;
      if (!result.data.session) return false;
      await complete(result.data.session, password, linkExisting);
      return true;
    } finally { operation.current = false; }
  };
  const verifyEmail = async (email: string, token: string, password: string, linkExisting: boolean) => {
    if (operation.current) return;
    operation.current = true;
    try {
      const db = requireBackend();
      const verified = await db.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: 'signup' });
      if (verified.error) throw verified.error;
      // Verify the password too before encrypting a new wallet with it.
      const result = await db.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (result.error) throw result.error;
      await complete(result.data.session, password, linkExisting);
    } finally { operation.current = false; }
  };
  const resendEmail = async (email: string) => {
    const result = await requireBackend().auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
    if (result.error) throw result.error;
  };
  const unlock = async (password: string, linkExisting: boolean) => {
    if (!session || operation.current) return;
    operation.current = true;
    try {
      const validated = await requireBackend().auth.signInWithPassword({ email: session.user.email!, password });
      if (validated.error) throw validated.error;
      await complete(validated.data.session, password, linkExisting);
    } finally { operation.current = false; }
  };
  const logout = async () => {
    if (operation.current) throw new Error('Espera a que termine el acceso a tu wallet.');
    const id = session?.user.id;
    revision.current++; setReady(false); setSession(null); sessionOwner.current = null;
    // Clear auth even if a Keychain deletion fails; routes remain locked.
    try { if (id) await removeWallet(id); }
    finally {
      const result = await requireBackend().auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
    }
  };
  return <Context.Provider value={{ configured: backendConfigured, initialized, user: session?.user ?? null, ready, error, hasLegacyWallet, login, register, verifyEmail, resendEmail, unlock, logout }}>{children}</Context.Provider>;
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error('AuthProvider no disponible.');
  return value;
}
