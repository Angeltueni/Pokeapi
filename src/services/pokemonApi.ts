import type { Pokemon } from '@/context/PokemonContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function obtenerPokemon(valor: string | number): Promise<Pokemon> {
  const texto = String(valor).trim();
  const esNumero = !isNaN(Number(texto));

  const url = esNumero
    ? `${API_URL}/pokemones/${encodeURIComponent(texto)}`
    : `${API_URL}/pokemones/nombre/${encodeURIComponent(texto.toLowerCase())}`;

  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || datos.mensaje || 'No se pudo buscar el Pokémon');
  }

  return datos;
}

export async function obtenerPokemones(): Promise<Pokemon[]> {
  const respuesta = await fetch(`${API_URL}/pokemones`);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || datos.mensaje || 'No se pudieron cargar los Pokémon');
  }

  return datos;
}
