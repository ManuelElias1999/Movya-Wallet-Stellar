import 'react-native-get-random-values';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TestnetWalletProvider } from '@/context/TestnetWalletContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TestnetWalletProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
      </TestnetWalletProvider>
    </SafeAreaProvider>
  );
}
