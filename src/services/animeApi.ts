import type { PersonajeAnime } from '@/context/AnimeContext';

const API_URL = process.env.EXPO_PUBLIC_ANIME_API_URL || process.env.EXPO_PUBLIC_API_URL;

export async function obtenerPersonaje(valor: string | number): Promise<PersonajeAnime> {
  const texto = String(valor).trim();
  const esNumero = !isNaN(Number(texto));

  const url = esNumero
    ? `${API_URL}/personajes/${encodeURIComponent(texto)}`
    : `${API_URL}/personajes/nombre/${encodeURIComponent(texto.toLowerCase())}`;

  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.detail || datos.error || datos.mensaje || 'No se pudo buscar el personaje');
  }

  return datos;
}

export async function obtenerPersonajes(): Promise<PersonajeAnime[]> {
  const respuesta = await fetch(`${API_URL}/personajes`);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.detail || datos.error || datos.mensaje || 'No se pudieron cargar los personajes');
  }

  return datos;
}
