import type { Pokemon } from '@/context/PokemonContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export async function obtenerPokemon(valor: string): Promise<Pokemon> {
  const respuesta = await fetch(`${API_URL}/pokemon`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pokemon: valor.toLowerCase() }),
  });

  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || 'No se pudo buscar el Pokémon');
  }

  return datos;
}
