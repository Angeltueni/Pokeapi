import { createContext, ReactNode, useContext, useState } from 'react';

import { obtenerPokemon } from '@/services/pokemonApi';

export type Pokemon = {
  id: number;
  nombre: string;
  imagen: string;
  altura: number;
  peso: number;
  tipos: string[];
  movimientos: string[];
};

type PokemonContextType = {
  pokemon: Pokemon | null;
  cargando: boolean;
  error: string;
  buscarPokemon: (valor: string | number) => Promise<boolean>;
  anterior: () => Promise<void>;
  siguiente: () => Promise<void>;
};

const PokemonContext = createContext<PokemonContextType | undefined>(undefined);

export function PokemonProvider({ children }: { children: ReactNode }) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const buscarPokemon = async (valor: string | number) => {
    const texto = String(valor).trim();

    if (!texto) {
      setError('Escribe el nombre o ID de un Pokémon');
      return false;
    }

    try {
      setCargando(true);
      setError('');

      const datos = await obtenerPokemon(texto);
      setPokemon(datos);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error');
      return false;
    } finally {
      setCargando(false);
    }
  };

  const anterior = async () => {
    if (pokemon && pokemon.id > 1) {
      await buscarPokemon(pokemon.id - 1);
    }
  };

  const siguiente = async () => {
    if (pokemon) {
      await buscarPokemon(pokemon.id + 1);
    }
  };

  return (
    <PokemonContext.Provider
      value={{ pokemon, cargando, error, buscarPokemon, anterior, siguiente }}
    >
      {children}
    </PokemonContext.Provider>
  );
}

export function usePokemon() {
  const context = useContext(PokemonContext);

  if (!context) {
    throw new Error('usePokemon debe usarse dentro de PokemonProvider');
  }

  return context;
}
