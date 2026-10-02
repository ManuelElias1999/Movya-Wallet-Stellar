import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { sessionStorage } from './storage';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const backendConfigured = Boolean(url && key);
// Only a publishable/anon key belongs in an Expo bundle. RLS is enforced in SQL.
export const supabase = backendConfigured ? createClient(url, key, {
  auth: { storage: sessionStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock },
}) : null;
export function requireBackend() {
  if (!supabase) throw new Error('El acceso por correo todavía no está conectado. Configura el proyecto de Supabase para activarlo.');
  return supabase;
}
if (Platform.OS !== 'web' && supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
