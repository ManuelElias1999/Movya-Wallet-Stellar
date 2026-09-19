import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#E9EFF5' },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="send" />
      <Stack.Screen name="receive" />
      <Stack.Screen name="swap" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="movya" />
    </Stack>
  );
}
