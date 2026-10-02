import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import * as api from '@/services/backend/contacts';
import { demoContacts } from '@/data/demo';

type Contacts = { contacts: api.Contact[]; loading: boolean; error: string; persistent: boolean; refresh: () => Promise<void>; add: typeof api.addContact; update: typeof api.updateContact; remove: typeof api.deleteContact };
const Context = createContext<Contacts | null>(null);
export function ContactsProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [contacts, setContacts] = useState<api.Contact[]>([]);
  const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    if (!auth.configured) { setContacts(demoContacts.map((c, i) => ({ ...c, favorite: i === 0 }))); return; }
    if (!auth.user || !auth.ready) { setContacts([]); setError(''); return; }
    setLoading(true); setError('');
    try { const next = await api.listContacts(); if (current === generation.current) setContacts(next); }
    catch (e) { if (current === generation.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar tus contactos.'); }
    finally { if (current === generation.current) setLoading(false); }
  }, [auth.configured, auth.user?.id, auth.ready]);
  useEffect(() => { setContacts([]); void refresh(); return () => { generation.current++; }; }, [refresh]);
  const add: typeof api.addContact = async input => {
    if (!auth.user || !auth.ready) throw new Error('Ingresa con tu correo para guardar contactos.');
    const current = generation.current; const next = await api.addContact(input);
    if (current === generation.current) setContacts(c => [...c, next]);
    return next;
  };
  const update: typeof api.updateContact = async (id, patch) => {
    const current = generation.current; const next = await api.updateContact(id, patch);
    if (current === generation.current) setContacts(c => c.map(v => v.id === id ? next : v));
    return next;
  };
  const remove: typeof api.deleteContact = async id => {
    const current = generation.current; await api.deleteContact(id);
    if (current === generation.current) setContacts(c => c.filter(v => v.id !== id));
  };
  return <Context.Provider value={{ contacts, loading, error, persistent: Boolean(auth.user && auth.ready), refresh, add, update, remove }}>{children}</Context.Provider>;
}
export function useContacts() { const c = useContext(Context); if (!c) throw new Error('ContactsProvider no disponible.'); return c; }
