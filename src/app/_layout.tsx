import { Tabs } from 'expo-router';

import { DragonBallProvider } from '@/context/DragonBallContext';
import { PokemonProvider } from '@/context/PokemonContext';

export default function RootLayout() {
  return (
    <PokemonProvider>
      <DragonBallProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarLabelStyle: { fontSize: 11 },
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Pokémon' }} />
          <Tabs.Screen name="datos-pokemon" options={{ title: 'Datos Pokémon' }} />
          <Tabs.Screen name="dragonball" options={{ title: 'Dragon Ball' }} />
          <Tabs.Screen name="datos-dragonball" options={{ title: 'Datos DB' }} />
        </Tabs>
      </DragonBallProvider>
    </PokemonProvider>
  );
}
