import type { PersonajeDragonBall } from '@/context/DragonBallContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export async function obtenerPersonajeDragonBall(
  nombre: string
): Promise<PersonajeDragonBall> {
  const respuesta = await fetch(`${API_URL}/dragonball`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nombre }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo consultar Dragon Ball');
  }

  return datos;
}
