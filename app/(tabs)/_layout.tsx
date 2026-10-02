import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={({ route }) => ({
        animation: Platform.OS === 'ios' ? 'default' : (route.params as { tabDirection?: string } | undefined)?.tabDirection === 'backward' ? 'slide_from_left' : 'slide_from_right',
        // UIKit uses a native pop for movement towards the left-hand tabs.
        animationTypeForReplace: Platform.OS === 'ios' && (route.params as { tabDirection?: string } | undefined)?.tabDirection === 'backward' ? 'pop' : 'push',
        animationDuration: 280,
        contentStyle: { backgroundColor: '#E9EFF5' },
        headerShown: false,
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="send" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="swap" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="movya" />
    </Stack>
  );
}
