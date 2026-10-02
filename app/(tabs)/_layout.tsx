import { Stack, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import { BottomNavigation } from '@/components/BottomNavigation';
import { MovyaChatSheet } from '@/components/MovyaChatSheet';
import { tabForPath } from '@/services/presentation';

export default function AppLayout() {
  const pathname = usePathname();
  const active = tabForPath(pathname);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => { setChatOpen(false); Keyboard.dismiss(); }, [pathname]);
  return <View style={{ flex: 1 }}>
    <Stack screenOptions={{ animation: 'none', contentStyle: { backgroundColor: '#E9EFF5' }, headerShown: false }}>
      <Stack.Screen name="index" /><Stack.Screen name="activity" />
      <Stack.Screen name="portfolio" /><Stack.Screen name="contacts" />
      <Stack.Screen name="send" /><Stack.Screen name="receive" />
      <Stack.Screen name="swap" /><Stack.Screen name="settings" />
      <Stack.Screen name="movya" />
    </Stack>
    {active ? <BottomNavigation active={active} onMovyaPress={() => setChatOpen(true)} /> : null}
    {chatOpen ? <MovyaChatSheet open onClose={() => { Keyboard.dismiss(); setChatOpen(false); }} /> : null}
  </View>;
}
