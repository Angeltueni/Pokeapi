import { inicializarBaseLocal } from '@/database/sqlite';
import {
  DocenteLocal,
  actualizarDocenteLocal,
  agregarOperacionPendiente,
  crearDocenteLocal,
  eliminarDocenteLocalFisicamente,
  eliminarOperacionesPendientesDocente,
  eliminarUpdatesPendientesDocente,
  guardarDocentesNubeEnLocal,
  marcarDocenteEliminado,
  obtenerDocenteLocalPorLocalId,
  obtenerDocentesLocales,
} from '@/database/docentesLocal';
import {
  ApiError,
  DocenteInput,
  actualizarDocente as actualizarDocenteApi,
  crearDocente as crearDocenteApi,
  eliminarDocente as eliminarDocenteApi,
  obtenerDocente as obtenerDocenteApi,
  obtenerDocentes as obtenerDocentesApi,
} from '@/services/docentesApi';
import {
  hayConexionInternet,
  sincronizarDocentesPendientes,
} from '@/services/docentesSync';

export type { DocenteInput } from '@/services/docentesApi';

export type DocenteModel = {
  id: number; // Siempre local_id como identificador unívoco y estable en la UI
  local_id: number;
  cloud_id: number | null;
  nombre: string;
  cargo: string | null;
  programa: string | null;
  resumen: string | null;
  pregrado: string | null;
  posgrado: string | null;
  experiencia: string | null;
  imagen: string | null;
  created_at: string;
  pendiente?: boolean;
};

// Conversión de registro SQLite a modelo consumible por la interfaz de usuario
function aDocenteModel(local: DocenteLocal): DocenteModel {
  return {
    id: local.local_id,
    local_id: local.local_id,
    cloud_id: local.cloud_id,
    nombre: local.nombre,
    cargo: local.cargo,
    programa: local.programa,
    resumen: local.resumen,
    pregrado: local.pregrado,
    posgrado: local.posgrado,
    experiencia: local.experiencia,
    imagen: local.imagen,
    created_at: local.created_at,
    pendiente: local.cloud_id === null,
  };
}

// Reconocer estrictamente fallos reales de conectividad/fetch (sin capturar errores de código o HTTP)
function esErrorDeRed(err: unknown): boolean {
  if (err instanceof ApiError) {
    return false; // Error HTTP funcional del servidor (400, 404, 500)
  }

  if (err instanceof Error) {
    const mensaje = err.message.toLowerCase();
    return (
      err.name === 'TypeError' ||
      err.name === 'AbortError' ||
      mensaje.includes('network request failed') ||
      mensaje.includes('failed to fetch') ||
      mensaje.includes('fetch failed') ||
      mensaje.includes('networkerror') ||
      mensaje.includes('econnrefused') ||
      mensaje.includes('enotfound') ||
      mensaje.includes('timeout') ||
      mensaje.includes('timed out') ||
      mensaje.includes('err_internet_disconnected') ||
      mensaje.includes('offline')
    );
  }

  return false;
}

// Inicialización de SQLite y sincronización de arranque
export async function inicializarRepositorio(): Promise<void> {
  await inicializarBaseLocal();
  const online = await hayConexionInternet();
  if (online) {
    await sincronizarDocentesPendientes();
  }
}

// LISTAR DOCENTES: Decisión transparente Nube / SQLite
export async function listarDocentes(): Promise<DocenteModel[]> {
  const online = await hayConexionInternet();

  if (online) {
    try {
      const docentesNube = await obtenerDocentesApi();
      await guardarDocentesNubeEnLocal(docentesNube);
    } catch (err) {
      if (esErrorDeRed(err)) {
        console.warn('Fallo de conectividad al consultar microservicio; usando SQLite local');
      } else {
        console.warn('Error funcional al consultar microservicio; recurriendo a copia local');
      }
    }
  }

  const locales = await obtenerDocentesLocales();
  return locales.map(aDocenteModel);
}

// CONSULTAR DOCENTE POR LOCAL_ID
export async function consultarDocente(localId: number): Promise<DocenteModel> {
  const local = await obtenerDocenteLocalPorLocalId(localId);
  if (!local) {
    throw new Error('Docente no encontrado en la base de datos local');
  }

  const online = await hayConexionInternet();
  if (online && local.cloud_id !== null) {
    try {
      const docenteNube = await obtenerDocenteApi(local.cloud_id);
      await guardarDocentesNubeEnLocal([docenteNube]);
      const actualizado = await obtenerDocenteLocalPorLocalId(localId);
      if (actualizado) {
        return aDocenteModel(actualizado);
      }
    } catch (err) {
      if (!esErrorDeRed(err)) {
        throw err; // Propagar errores funcionales y de código
      }
      console.warn('Fallo de conectividad al obtener docente de la nube; usando copia local');
    }
  }

  return aDocenteModel(local);
}

// CREAR DOCENTE
export async function crearDocente(datos: DocenteInput): Promise<DocenteModel> {
  const online = await hayConexionInternet();

  if (online) {
    try {
      // 1. Crear en la nube vía microservicio POST /docentes
      const docenteNube = await crearDocenteApi(datos);
      // 2. Guardar inmediatamente en SQLite con su cloud_id
      const local = await crearDocenteLocal(datos, docenteNube.id);
      return aDocenteModel(local);
    } catch (err) {
      if (!esErrorDeRed(err)) {
        // Error funcional o inesperado: propagar y NO guardar como offline
        throw err;
      }
      console.warn('Fallo real de red al crear en microservicio; guardando en cola offline');
    }
  }

  // Creación offline: Guardar en docentes_local y en sync_pendiente
  const nuevoLocal = await crearDocenteLocal(datos, null);
  await agregarOperacionPendiente('CREATE', nuevoLocal.local_id, null, datos);
  return aDocenteModel(nuevoLocal);
}

// ACTUALIZAR DOCENTE
// Estrategia de conflictos: Last local state wins (payload completo acumulado)
export async function actualizarDocente(
  localId: number,
  datos: Partial<DocenteInput>
): Promise<DocenteModel> {
  const local = await obtenerDocenteLocalPorLocalId(localId);
  if (!local) {
    throw new Error('Docente no encontrado para actualizar');
  }

  const online = await hayConexionInternet();

  if (online && local.cloud_id !== null) {
    try {
      // 1. Actualizar en la nube vía microservicio PATCH /docentes/{cloud_id}
      await actualizarDocenteApi(local.cloud_id, datos);
      // 2. Actualizar en SQLite local
      const actualizado = await actualizarDocenteLocal(local.local_id, datos);
      // 3. Limpiar cualquier UPDATE pendiente anterior para evitar que sobrescriba el estado online más reciente
      await eliminarUpdatesPendientesDocente(local.local_id, local.cloud_id);
      return aDocenteModel(actualizado);
    } catch (err) {
      if (!esErrorDeRed(err)) {
        // Error funcional del servidor (400, 404) o inesperado: propagar
        throw err;
      }
      console.warn('Fallo real de red al actualizar en microservicio; guardando en cola offline');
    }
  }

  // Actualización offline: Actualizar SQLite y encolar el estado acumulado completo
  const localActualizado = await actualizarDocenteLocal(local.local_id, datos);

  const payloadCompleto: DocenteInput = {
    nombre: localActualizado.nombre,
    cargo: localActualizado.cargo || undefined,
    programa: localActualizado.programa || undefined,
    resumen: localActualizado.resumen || undefined,
    pregrado: localActualizado.pregrado || undefined,
    posgrado: localActualizado.posgrado || undefined,
    experiencia: localActualizado.experiencia || undefined,
    imagen: localActualizado.imagen || undefined,
  };

  await agregarOperacionPendiente(
    'UPDATE',
    local.local_id,
    local.cloud_id,
    payloadCompleto
  );

  return aDocenteModel(localActualizado);
}

// ELIMINAR DOCENTE
export async function eliminarDocente(localId: number): Promise<void> {
  const local = await obtenerDocenteLocalPorLocalId(localId);
  if (!local) {
    return;
  }

  const online = await hayConexionInternet();

  if (online && local.cloud_id !== null) {
    try {
      // 1. Eliminar en la nube vía microservicio DELETE /docentes/{cloud_id}
      await eliminarDocenteApi(local.cloud_id);
      // 2. Eliminar físicamente en SQLite
      await eliminarDocenteLocalFisicamente(local.local_id);
      // 3. Limpiar cualquier operación pendiente previa de este docente
      await eliminarOperacionesPendientesDocente(local.local_id, local.cloud_id);
      return;
    } catch (err) {
      if (!esErrorDeRed(err)) {
        throw err;
      }
      console.warn('Fallo real de red al eliminar en microservicio; marcando para cola offline');
    }
  }

  // Eliminación offline
  if (local.cloud_id === null) {
    // Si fue creado offline y nunca se sincronizó, purgarlo directamente
    await agregarOperacionPendiente('DELETE', local.local_id, null, null);
  } else {
    // Si ya existe en la nube, marcar eliminado = 1 y encolar DELETE
    await marcarDocenteEliminado(local.local_id);
    await agregarOperacionPendiente('DELETE', local.local_id, local.cloud_id, null);
  }
}
