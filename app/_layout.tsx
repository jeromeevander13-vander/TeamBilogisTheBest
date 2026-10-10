import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0369A1' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#F1F5F9' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'TindaTrack' }} />
      <Stack.Screen name="order" options={{ title: 'Take Store Order' }} />
      <Stack.Screen name="checked-out" options={{ title: 'Checked-out Orders' }} />
    </Stack>
  );
}

