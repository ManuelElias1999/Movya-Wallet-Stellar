import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ThemeStorage } from './preference';

const key = 'movya.preferences.appearance';
export const themeStorage: ThemeStorage = {
  read: async () => Platform.OS === 'web' ? (typeof window === 'undefined' ? null : window.localStorage.getItem(key)) : SecureStore.getItemAsync(key),
  write: async mode => {
    if (Platform.OS === 'web') { if (typeof window !== 'undefined') window.localStorage.setItem(key, mode); }
    else await SecureStore.setItemAsync(key, mode);
  },
};
