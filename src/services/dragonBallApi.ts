const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export type PersonajeDragonBall = {
  id: number;
  nombre: string;
  imagen: string;
  raza: string;
  ki: string;
  descripcion: string;
};

export async function obtenerPersonajeDragonBall(): Promise<PersonajeDragonBall> {
  const respuesta = await fetch(`${API_URL}/dragonball`);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo consultar Dragon Ball');
  }

  return datos;
}
