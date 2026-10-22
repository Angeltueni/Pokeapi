export type ProveedorIA = 'gemini' | 'groq';
export type TimeoutIA = 20 | 40 | 80 | 160;

export interface ProveedorInfo {
  id: ProveedorIA;
  nombre: string;
  disponible: boolean;
}

export interface ConfiguracionIA {
  proveedores: ProveedorInfo[];
  proveedorPorDefecto: ProveedorIA;
  timeouts: TimeoutIA[];
  timeoutPorDefecto: TimeoutIA;
}

export interface RespuestaIA {
  pregunta: string;
  respuesta: string;
  modo: string;
  proveedor?: ProveedorIA;
  timeout?: number;
  tiempoTotalMs?: number;
  contexto?: {
    pokemones: number;
    personajes: number;
  };
}

const IA_API_URL = process.env.EXPO_PUBLIC_IA_API_URL || 'https://microservice-ia.onrender.com';

export async function obtenerConfiguracionIA(): Promise<ConfiguracionIA> {
  const url = `${IA_API_URL}/ia/configuracion`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const respuesta = await fetch(url, { signal: controller.signal });
    if (!respuesta.ok) {
      throw new Error(`Error ${respuesta.status} al consultar configuración`);
    }
    const datos = await respuesta.json();
    return datos;
  } catch (err: any) {
    // Fallback defensivo si el backend aún no expone /ia/configuracion o falla
    return {
      proveedores: [
        { id: 'gemini', nombre: 'Gemini', disponible: true },
        { id: 'groq', nombre: 'Groq', disponible: false },
      ],
      proveedorPorDefecto: 'gemini',
      timeouts: [20, 40, 80, 160],
      timeoutPorDefecto: 40,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function preguntarIA(
  pregunta: string,
  proveedor: ProveedorIA = 'gemini',
  timeout: TimeoutIA = 40
): Promise<RespuestaIA> {
  const preguntaLimpia = pregunta.trim();
  if (!preguntaLimpia) {
    throw new Error('La pregunta no puede estar vacía.');
  }

  const url = `${IA_API_URL}/ia/pokeanime?pregunta=${encodeURIComponent(preguntaLimpia)}&proveedor=${encodeURIComponent(proveedor)}&timeout=${encodeURIComponent(String(timeout))}`;
  console.log('IA_API_URL:', IA_API_URL);
  console.log('URL IA:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout * 1000);

  try {
    const respuesta = await fetch(url, { signal: controller.signal });
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
      if (respuesta.status === 504) {
        throw new Error(datos.error || `Se agotó el tiempo de espera configurado (${timeout}s).`);
      }
      if (respuesta.status === 503) {
        throw new Error(datos.error || 'El proveedor Groq no está configurado en el servidor.');
      }
      throw new Error(datos.error || datos.detalle || 'Error al consultar el asistente de IA');
    }

    return datos;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`La consulta superó el tiempo máximo de ${timeout} segundos.`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
