import 'react-native-get-random-values';
import 'fast-text-encoding';

import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Appearance, Platform, View } from 'react-native';
import { Alert } from '@/i18n/primitives';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ContactsProvider } from '@/context/ContactsContext';
import { TestnetWalletProvider } from '@/context/TestnetWalletContext';
import { LanguageProvider } from '@/i18n/Language';
import { AppLockOverlay } from '@/components/AppLockOverlay';
import { ThemeProvider, useTheme } from '@/theme/Theme';
import { themeStorage } from '@/theme/storage';

export default function RootLayout() {
  return (
    <ThemeProvider storage={themeStorage}><LanguageProvider><SafeAreaProvider>
      <AuthProvider><TestnetWalletProvider><ContactsProvider>
      <AppRoutes />
      </ContactsProvider></TestnetWalletProvider></AuthProvider>
    </SafeAreaProvider></LanguageProvider></ThemeProvider>
  );
}

function AppRoutes() {
  const { colors, mode } = useTheme();
  const auth = useAuth(); const router = useRouter();
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(mode);
    else if (typeof document !== 'undefined') { document.documentElement.style.colorScheme = mode; document.body.style.backgroundColor = colors.background; }
  }, [mode, colors.background]);
  // "New sign-in" alert: a device this phone has not seen before was registered.
  const newDevice = auth.ready && !auth.locked ? auth.newDevices[0] : undefined;
  useEffect(() => {
    if (!newDevice) return;
    Alert.alert('Nuevo inicio de sesión', `Tu cuenta se abrió en: ${newDevice.label}. Si no fuiste tú, cierra esa sesión y reporta el dispositivo.`, [
      { text: 'Fui yo', onPress: () => void auth.acknowledgeDevices() },
      { text: 'Revisar', style: 'destructive', onPress: () => router.push('/devices') },
    ]);
  }, [newDevice?.id]);
  if (!auth.initialized) return null;
  return <View style={{ flex: 1, backgroundColor: colors.background }} onStartShouldSetResponderCapture={() => { auth.touch(); return false; }}>
    <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={!auth.configured || !auth.ready}><Stack.Screen name="index" /></Stack.Protected>
      <Stack.Protected guard={!auth.configured || Boolean(auth.user && auth.ready && !auth.needsBackup && !auth.needsOnboarding)}>
        <Stack.Screen name="(tabs)" /><Stack.Screen name="testnet-wallet" />
        <Stack.Screen name="security" /><Stack.Screen name="entering-wallet" /><Stack.Screen name="recovery-kit" />
        <Stack.Screen name="devices" /><Stack.Screen name="two-factor" /><Stack.Screen name="emergency-transfer" />
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
    <AppLockOverlay />
  </View>;
}
