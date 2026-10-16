import { useEffect, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createLanguageStore, localeFor, translateText } from './core';
const key = 'movya.preferences.language';
export const languageStore = createLanguageStore({
  read: async () => Platform.OS === 'web' ? (typeof window === 'undefined' ? null : window.localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  write: async value => { if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.localStorage.setItem(key, value); } else await SecureStore.setItemAsync(key, value); },
});
export function useLanguage() {
  const language = useSyncExternalStore(languageStore.subscribe, languageStore.get, () => 'es' as const);
  return { language, locale: localeFor(language), setLanguage: languageStore.set, t: (text: string) => translateText(text, language) };
}
export const translate = (text: string) => translateText(text, languageStore.get());
export function LanguageProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  useEffect(() => { let mounted = true; void languageStore.hydrate().finally(() => { if (mounted) setReady(true); }); return () => { mounted = false; }; }, []);
  return ready ? children : null;
}
