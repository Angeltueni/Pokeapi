export interface RespuestaIA {
  pregunta: string;
  respuesta: string;
  modo: string;
  contexto?: {
    pokemones: number;
    personajes: number;
  };
}

const IA_API_URL = process.env.EXPO_PUBLIC_IA_API_URL || 'http://localhost:3006';

export async function preguntarIA(pregunta: string): Promise<RespuestaIA> {
  const preguntaLimpia = pregunta.trim();
  if (!preguntaLimpia) {
    throw new Error('La pregunta no puede estar vacía.');
  }

  const url = `${IA_API_URL}/ia/pokeanime?pregunta=${encodeURIComponent(preguntaLimpia)}`;
  const respuesta = await fetch(url);
  const datos = await respuesta.json();

  if (!respuesta.ok) {
    throw new Error(datos.error || datos.detalle || 'Error al consultar el asistente de IA');
  }

  return datos;
}
