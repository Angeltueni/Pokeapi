const API_URL = process.env.EXPO_PUBLIC_DOCENTES_API_URL;
const API_CREAR_URL = process.env.EXPO_PUBLIC_DOCENTES_CREAR_API_URL;
const API_ACTUALIZAR_URL = process.env.EXPO_PUBLIC_DOCENTES_ACTUALIZAR_API_URL;
const API_ELIMINAR_URL = process.env.EXPO_PUBLIC_DOCENTES_ELIMINAR_API_URL;

// Clase de error personalizada para diferenciar errores HTTP funcionales de fallos de red
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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

export type DocenteInput = {
  nombre: string;
  cargo?: string;
  programa?: string;
  resumen?: string;
  pregrado?: string;
  posgrado?: string;
  experiencia?: string;
  imagen?: string;
};

export async function obtenerDocentes(): Promise<Docente[]> {
  const respuesta = await fetch(`${API_URL}/docentes`);

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => null);
    throw new ApiError(
      errorData?.error || 'No se pudo obtener la información de los docentes',
      respuesta.status
    );
  }

  const datos = await respuesta.json();
  return datos;
}

export async function obtenerDocente(id: number): Promise<Docente> {
  const respuesta = await fetch(`${API_URL}/docentes/${id}`);

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => null);
    throw new ApiError(
      errorData?.error || 'No se pudo obtener la información del docente',
      respuesta.status
    );
  }

  const datos = await respuesta.json();
  return datos;
}

export async function crearDocente(datos: DocenteInput): Promise<Docente> {
  const params = new URLSearchParams();
  params.append('nombre', datos.nombre);

  if (datos.cargo !== undefined && datos.cargo !== '') {
    params.append('cargo', datos.cargo);
  }
  if (datos.programa !== undefined && datos.programa !== '') {
    params.append('programa', datos.programa);
  }
  if (datos.resumen !== undefined && datos.resumen !== '') {
    params.append('resumen', datos.resumen);
  }
  if (datos.pregrado !== undefined && datos.pregrado !== '') {
    params.append('pregrado', datos.pregrado);
  }
  if (datos.posgrado !== undefined && datos.posgrado !== '') {
    params.append('posgrado', datos.posgrado);
  }
  if (datos.experiencia !== undefined && datos.experiencia !== '') {
    params.append('experiencia', datos.experiencia);
  }
  if (datos.imagen !== undefined && datos.imagen !== '') {
    params.append('imagen', datos.imagen);
  }

  const respuesta = await fetch(`${API_CREAR_URL}/docentes?${params.toString()}`, {
    method: 'POST',
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => null);
    throw new ApiError(
      errorData?.error || 'No se pudo crear el docente',
      respuesta.status
    );
  }

  const resultado = await respuesta.json();
  return resultado;
}

export async function actualizarDocente(
  id: number,
  datos: Partial<DocenteInput>
): Promise<Docente> {
  const params = new URLSearchParams();

  if (datos.nombre !== undefined) {
    params.append('nombre', datos.nombre);
  }
  if (datos.cargo !== undefined) {
    params.append('cargo', datos.cargo);
  }
  if (datos.programa !== undefined) {
    params.append('programa', datos.programa);
  }
  if (datos.resumen !== undefined) {
    params.append('resumen', datos.resumen);
  }
  if (datos.pregrado !== undefined) {
    params.append('pregrado', datos.pregrado);
  }
  if (datos.posgrado !== undefined) {
    params.append('posgrado', datos.posgrado);
  }
  if (datos.experiencia !== undefined) {
    params.append('experiencia', datos.experiencia);
  }
  if (datos.imagen !== undefined) {
    params.append('imagen', datos.imagen);
  }

  const respuesta = await fetch(
    `${API_ACTUALIZAR_URL}/docentes/${id}?${params.toString()}`,
    {
      method: 'PATCH',
    }
  );

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => null);
    throw new ApiError(
      errorData?.error || 'No se pudo actualizar el docente',
      respuesta.status
    );
  }

  const resultado = await respuesta.json();
  return resultado.docente || resultado;
}

export async function eliminarDocente(
  id: number
): Promise<{ mensaje: string; docente?: Docente }> {
  const respuesta = await fetch(`${API_ELIMINAR_URL}/docentes/${id}`, {
    method: 'DELETE',
  });

  if (!respuesta.ok) {
    const errorData = await respuesta.json().catch(() => null);
    throw new ApiError(
      errorData?.error || 'No se pudo eliminar el docente',
      respuesta.status
    );
  }

  const resultado = await respuesta.json();
  return resultado;
}
