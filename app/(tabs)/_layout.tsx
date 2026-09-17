import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F3F7FC' },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="contacts" />
      <Stack.Screen name="movya" />
    </Stack>
  );
}
