import { createContext, ReactNode, useContext, useState } from 'react';

import { obtenerPersonaje, obtenerPersonajes } from '@/services/animeApi';

export type PersonajeAnime = {
  id: number;
  nombre: string;
  nombre_api?: string;
  anime: string;
  imagen: string | null;
  imagen2: string | null;
  imagen3: string | null;
  descripcion: string;
};

type AnimeContextType = {
  personaje: PersonajeAnime | null;
  cargando: boolean;
  error: string;
  buscarPersonaje: (valor: string | number) => Promise<boolean>;
  anterior: () => Promise<void>;
  siguiente: () => Promise<void>;
};

const AnimeContext = createContext<AnimeContextType | undefined>(undefined);

export function AnimeProvider({ children }: { children: ReactNode }) {
  const [personaje, setPersonaje] = useState<PersonajeAnime | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const buscarPersonaje = async (valor: string | number) => {
    const texto = String(valor).trim();

    if (!texto) {
      setError('Escribe el nombre o ID de un personaje');
      return false;
    }

    try {
      setCargando(true);
      setError('');

      const datos = await obtenerPersonaje(texto);
      setPersonaje(datos);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error');
      return false;
    } finally {
      setCargando(false);
    }
  };

  const cambiarPersonaje = async (direccion: 'anterior' | 'siguiente') => {
    if (!personaje) return;

    try {
      setCargando(true);
      setError('');

      const lista = await obtenerPersonajes();
      if (!lista || lista.length === 0) return;

      const indiceActual = lista.findIndex((p) => p.id === personaje.id);

      let nuevoIndice = 0;
      if (indiceActual === -1) {
        nuevoIndice = 0;
      } else if (direccion === 'siguiente') {
        nuevoIndice = indiceActual + 1 >= lista.length ? 0 : indiceActual + 1;
      } else {
        nuevoIndice = indiceActual - 1 < 0 ? lista.length - 1 : indiceActual - 1;
      }

      setPersonaje(lista[nuevoIndice]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error al cambiar de personaje');
    } finally {
      setCargando(false);
    }
  };

  const anterior = async () => {
    await cambiarPersonaje('anterior');
  };

  const siguiente = async () => {
    await cambiarPersonaje('siguiente');
  };

  return (
    <AnimeContext.Provider
      value={{ personaje, cargando, error, buscarPersonaje, anterior, siguiente }}
    >
      {children}
    </AnimeContext.Provider>
  );
}

export function useAnime() {
  const context = useContext(AnimeContext);

  if (!context) {
    throw new Error('useAnime debe usarse dentro de AnimeProvider');
  }

  return context;
}
