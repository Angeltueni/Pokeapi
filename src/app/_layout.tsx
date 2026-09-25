import { Stack } from 'expo-router';

import { PokemonProvider } from '@/context/PokemonContext';

export default function RootLayout() {
  return (
    <PokemonProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="detalles" />
      </Stack>
    </PokemonProvider>
  );
}
