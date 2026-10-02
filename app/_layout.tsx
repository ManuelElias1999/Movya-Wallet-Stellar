import 'react-native-get-random-values';
import 'fast-text-encoding';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ContactsProvider } from '@/context/ContactsContext';
import { TestnetWalletProvider } from '@/context/TestnetWalletContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider><TestnetWalletProvider><ContactsProvider>
      <StatusBar style="dark" />
      <AppRoutes />
      </ContactsProvider></TestnetWalletProvider></AuthProvider>
    </SafeAreaProvider>
  );
}

function AppRoutes() {
  const auth = useAuth();
  if (!auth.initialized) return null;
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!auth.configured || !auth.ready}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!auth.configured || Boolean(auth.user && auth.ready && !auth.needsBackup)}>
      <Stack.Screen name="(tabs)" /><Stack.Screen name="testnet-wallet" />
      <Stack.Screen name="onboarding" /><Stack.Screen name="entering-wallet" />
    </Stack.Protected>
    <Stack.Protected guard={!auth.configured || Boolean(auth.user && auth.ready)}>
      <Stack.Screen name="wallet-backup" />
    </Stack.Protected>
  </Stack>;
}
