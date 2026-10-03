const API_URL = process.env.EXPO_PUBLIC_DOCENTES_API_URL;

export type Docente = {
  id: number;
  nombre: string;
  cargo: string | null;
  programa: string | null;
  resumen: string | null;
  pregrado: string | null;
  posgrado: string | null;
  experiencia: string | null;
  imagen: string | null;
  created_at: string;
};

export async function obtenerDocentes(): Promise<Docente[]> {
  const respuesta = await fetch(`${API_URL}/docentes`);

  if (!respuesta.ok) {
    throw new Error("No se pudo obtener la información de los docentes");
  }

  const datos = await respuesta.json();
  return datos;
}

export async function obtenerDocente(id: number): Promise<Docente> {
  const respuesta = await fetch(`${API_URL}/docentes/${id}`);

  if (!respuesta.ok) {
    throw new Error("No se pudo obtener la información del docente");
  }

  const datos = await respuesta.json();
  return datos;
}
