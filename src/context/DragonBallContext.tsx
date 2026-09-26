import { createContext, ReactNode, useContext, useState } from 'react';

import { obtenerPersonajeDragonBall } from '@/services/dragonBallApi';

export type PersonajeDragonBall = {
  id: number;
  nombre: string;
  imagen: string | null;
  imagen2: string | null;
  imagen3: string | null;
  raza: string;
  ki: string;
  genero: string;
  afiliacion: string;
  descripcion: string;
};

type DragonBallContextType = {
  personaje: PersonajeDragonBall | null;
  cargando: boolean;
  error: string;
  buscarPersonaje: (nombre: string) => Promise<boolean>;
};

const DragonBallContext = createContext<DragonBallContextType | undefined>(undefined);

export function DragonBallProvider({ children }: { children: ReactNode }) {
  const [personaje, setPersonaje] = useState<PersonajeDragonBall | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const buscarPersonaje = async (nombre: string) => {
    const texto = nombre.trim();

    if (!texto) {
      setError('Escribe el nombre de un personaje');
      return false;
    }

    try {
      setCargando(true);
      setError('');

      const datos = await obtenerPersonajeDragonBall(texto);
      setPersonaje(datos);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error');
      return false;
    } finally {
      setCargando(false);
    }
  };

  return (
    <DragonBallContext.Provider value={{ personaje, cargando, error, buscarPersonaje }}>
      {children}
    </DragonBallContext.Provider>
  );
}

export function useDragonBall() {
  const context = useContext(DragonBallContext);

  if (!context) {
    throw new Error('useDragonBall debe usarse dentro de DragonBallProvider');
  }

  return context;
}
