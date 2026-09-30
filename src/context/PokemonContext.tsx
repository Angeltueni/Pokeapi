import { createContext, ReactNode, useContext, useState } from 'react';

import { obtenerPokemon, obtenerPokemones } from '@/services/pokemonApi';

export type Pokemon = {
  id: number;
  nombre: string;
  imagen: string | null;
  imagen2: string | null;
  imagen3: string | null;
  altura: number | null;
  peso: number | null;
  movimiento1: string | null;
  movimiento2: string | null;
  created_at?: string;
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

  const cambiarPokemon = async (direccion: 'anterior' | 'siguiente') => {
    if (!pokemon) return;

    try {
      setCargando(true);
      setError('');

      const lista = await obtenerPokemones();
      if (!lista || lista.length === 0) return;

      const indiceActual = lista.findIndex((p) => p.id === pokemon.id);

      let nuevoIndice = 0;
      if (indiceActual === -1) {
        nuevoIndice = 0;
      } else if (direccion === 'siguiente') {
        nuevoIndice = indiceActual + 1 >= lista.length ? 0 : indiceActual + 1;
      } else {
        nuevoIndice = indiceActual - 1 < 0 ? lista.length - 1 : indiceActual - 1;
      }

      setPokemon(lista[nuevoIndice]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error al cambiar de Pokémon');
    } finally {
      setCargando(false);
    }
  };

  const anterior = async () => {
    await cambiarPokemon('anterior');
  };

  const siguiente = async () => {
    await cambiarPokemon('siguiente');
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
