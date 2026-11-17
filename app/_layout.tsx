import 'react-native-get-random-values';
import 'fast-text-encoding';

import { Stack } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ContactsProvider } from '@/context/ContactsContext';
import { TestnetWalletProvider } from '@/context/TestnetWalletContext';
import { LanguageProvider } from '@/i18n/Language';

export default function RootLayout() {
  return (
    <LanguageProvider><SafeAreaProvider>
      <AuthProvider><TestnetWalletProvider><ContactsProvider>
      <StatusBar style="dark" />
      <AppRoutes />
      </ContactsProvider></TestnetWalletProvider></AuthProvider>
    </SafeAreaProvider></LanguageProvider>
  );
}

function AppRoutes() {
  const auth = useAuth();
  if (!auth.initialized) return null;
  // Any touch counts as activity for the automatic lock; never captures the touch.
  return <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { auth.touch(); return false; }}>
  <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={!auth.configured || !auth.ready}><Stack.Screen name="index" /></Stack.Protected>
    <Stack.Protected guard={!auth.configured || Boolean(auth.user && auth.ready && !auth.needsBackup && !auth.needsOnboarding)}>
      <Stack.Screen name="(tabs)" /><Stack.Screen name="testnet-wallet" />
      <Stack.Screen name="security" /><Stack.Screen name="entering-wallet" /><Stack.Screen name="recovery-kit" />
    </Stack.Protected>
    <Stack.Protected guard={!auth.configured || Boolean(auth.user && auth.ready && !auth.needsBackup && auth.needsOnboarding)}>
      <Stack.Screen name="onboarding" />
    </Stack.Protected>
    <Stack.Protected guard={!auth.configured || Boolean(auth.user && auth.ready)}>
      <Stack.Screen name="wallet-backup" />
    </Stack.Protected>
    {/* Reachable while locked (password reset) and while open (lost device). */}
    <Stack.Protected guard={Boolean(auth.configured && auth.user)}>
      <Stack.Screen name="restore-words" />
    </Stack.Protected>
  </Stack>
  </View>;
}
