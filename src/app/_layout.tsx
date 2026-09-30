import { Tabs } from 'expo-router';

import { PokemonProvider } from '@/context/PokemonContext';

export default function RootLayout() {
  return (
    <PokemonProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarLabelStyle: { fontSize: 11 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Pokémon' }} />
        <Tabs.Screen name="datos-pokemon" options={{ title: 'Datos Pokémon' }} />
      </Tabs>
    </PokemonProvider>
  );
}
