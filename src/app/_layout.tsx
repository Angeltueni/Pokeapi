import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AnimeProvider } from '@/context/AnimeContext';
import { PokemonProvider } from '@/context/PokemonContext';

export default function RootLayout() {
  return (
    <PokemonProvider>
      <AnimeProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarLabelStyle: { fontSize: 11 },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Pokémon',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="paw" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="datos-pokemon"
            options={{
              title: 'Datos Pokémon',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="information-circle" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="anime"
            options={{
              title: 'Anime',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="film" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="datos-anime"
            options={{
              title: 'Datos Anime',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="document-text" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="docentes"
            options={{
              title: 'Docentes',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="school" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="detalles"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </AnimeProvider>
    </PokemonProvider>
  );
}
