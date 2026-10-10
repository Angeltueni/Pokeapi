import { obtenerBaseDatos } from './sqlite';
import { Docente, DocenteInput } from '@/services/docentesApi';

export type DocenteLocal = {
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
  eliminado: number;
  updated_at: string | null;
};

export type OperacionPendiente = {
  id: number;
  local_id: number | null;
  cloud_id: number | null;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string | null;
  created_at: string;
};

// Obtener todos los docentes locales no eliminados
export async function obtenerDocentesLocales(): Promise<DocenteLocal[]> {
  const db = await obtenerBaseDatos();
  const rows = await db.getAllAsync<DocenteLocal>(
    'SELECT * FROM docentes_local WHERE eliminado = 0 ORDER BY local_id ASC'
  );
  return rows;
}

// Obtener docente local por cloud_id
export async function obtenerDocenteLocalPorCloudId(
  cloudId: number
): Promise<DocenteLocal | null> {
  const db = await obtenerBaseDatos();
  const row = await db.getFirstAsync<DocenteLocal>(
    'SELECT * FROM docentes_local WHERE cloud_id = ? AND eliminado = 0',
    [cloudId]
  );
  return row || null;
}

// Obtener docente local por local_id
export async function obtenerDocenteLocalPorLocalId(
  localId: number
): Promise<DocenteLocal | null> {
  const db = await obtenerBaseDatos();
  const row = await db.getFirstAsync<DocenteLocal>(
    'SELECT * FROM docentes_local WHERE local_id = ? AND eliminado = 0',
    [localId]
  );
  return row || null;
}

// Insertar docente en SQLite
export async function crearDocenteLocal(
  datos: DocenteInput,
  cloudId: number | null = null
): Promise<DocenteLocal> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();

  const resultado = await db.runAsync(
    `INSERT INTO docentes_local 
      (cloud_id, nombre, cargo, programa, resumen, pregrado, posgrado, experiencia, imagen, created_at, eliminado, updated_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [
      cloudId,
      datos.nombre,
      datos.cargo || null,
      datos.programa || null,
      datos.resumen || null,
      datos.pregrado || null,
      datos.posgrado || null,
      datos.experiencia || null,
      datos.imagen || null,
      ahora,
      ahora,
    ]
  );

  const localId = resultado.lastInsertRowId;
  const docente = await obtenerDocenteLocalPorLocalId(localId);
  if (!docente) {
    throw new Error('Error al recuperar el docente recién insertado en SQLite');
  }
  return docente;
}

// Actualizar docente local por local_id
export async function actualizarDocenteLocal(
  localId: number,
  datos: Partial<DocenteInput>,
  cloudId?: number | null
): Promise<DocenteLocal> {
  const db = await obtenerBaseDatos();
  const docenteActual = await obtenerDocenteLocalPorLocalId(localId);

  if (!docenteActual) {
    throw new Error('Docente local no encontrado para actualizar');
  }

  const nombre = datos.nombre !== undefined ? datos.nombre : docenteActual.nombre;
  const cargo = datos.cargo !== undefined ? datos.cargo : docenteActual.cargo;
  const programa =
    datos.programa !== undefined ? datos.programa : docenteActual.programa;
  const resumen = datos.resumen !== undefined ? datos.resumen : docenteActual.resumen;
  const pregrado =
    datos.pregrado !== undefined ? datos.pregrado : docenteActual.pregrado;
  const posgrado =
    datos.posgrado !== undefined ? datos.posgrado : docenteActual.posgrado;
  const experiencia =
    datos.experiencia !== undefined ? datos.experiencia : docenteActual.experiencia;
  const imagen = datos.imagen !== undefined ? datos.imagen : docenteActual.imagen;
  const targetCloudId =
    cloudId !== undefined ? cloudId : docenteActual.cloud_id;
  const ahora = new Date().toISOString();

  await db.runAsync(
    `UPDATE docentes_local 
     SET cloud_id = ?, nombre = ?, cargo = ?, programa = ?, resumen = ?, pregrado = ?, posgrado = ?, experiencia = ?, imagen = ?, updated_at = ?
     WHERE local_id = ?`,
    [
      targetCloudId,
      nombre,
      cargo,
      programa,
      resumen,
      pregrado,
      posgrado,
      experiencia,
      imagen,
      ahora,
      localId,
    ]
  );

  const docenteActualizado = await obtenerDocenteLocalPorLocalId(localId);
  if (!docenteActualizado) {
    throw new Error('Error al recuperar el docente actualizado en SQLite');
  }
  return docenteActualizado;
}

// Marcar docente como eliminado lógicamente (eliminado = 1)
export async function marcarDocenteEliminado(localId: number): Promise<void> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();
  await db.runAsync(
    'UPDATE docentes_local SET eliminado = 1, updated_at = ? WHERE local_id = ?',
    [ahora, localId]
  );
}

// Eliminar docente físicamente de la base local SQLite
export async function eliminarDocenteLocalFisicamente(
  localId: number
): Promise<void> {
  const db = await obtenerBaseDatos();
  await db.runAsync('DELETE FROM docentes_local WHERE local_id = ?', [localId]);
}

// Guardar/Actualizar docentes de la nube en SQLite PROTEGIENDO cambios locales pendientes
export async function guardarDocentesNubeEnLocal(
  docentesNube: Docente[]
): Promise<void> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();

  for (const doc of docentesNube) {
    // 1. Comprobar si existe localmente
    const existe = await db.getFirstAsync<DocenteLocal>(
      'SELECT * FROM docentes_local WHERE cloud_id = ?',
      [doc.id]
    );

    if (existe) {
      // 2. Comprobar si este docente tiene operaciones pendientes de sincronización
      const tienePendiente = await db.getFirstAsync<OperacionPendiente>(
        'SELECT id FROM sync_pendiente WHERE (cloud_id = ? OR local_id = ?)',
        [doc.id, existe.local_id]
      );

      // Si tiene modificaciones offline pendientes o está marcado como eliminado, NO sobrescribir con la nube
      if (tienePendiente || existe.eliminado === 1) {
        continue;
      }

      // Si está limpio, actualizar con los datos más recientes de la nube
      await db.runAsync(
        `UPDATE docentes_local 
         SET nombre = ?, cargo = ?, programa = ?, resumen = ?, pregrado = ?, posgrado = ?, experiencia = ?, imagen = ?, created_at = ?, eliminado = 0, updated_at = ?
         WHERE local_id = ?`,
        [
          doc.nombre,
          doc.cargo,
          doc.programa,
          doc.resumen,
          doc.pregrado,
          doc.posgrado,
          doc.experiencia,
          doc.imagen,
          doc.created_at,
          ahora,
          existe.local_id,
        ]
      );
    } else {
      // Insertar nuevo registro proveniente de la nube
      await db.runAsync(
        `INSERT INTO docentes_local 
          (cloud_id, nombre, cargo, programa, resumen, pregrado, posgrado, experiencia, imagen, created_at, eliminado, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
        [
          doc.id,
          doc.nombre,
          doc.cargo,
          doc.programa,
          doc.resumen,
          doc.pregrado,
          doc.posgrado,
          doc.experiencia,
          doc.imagen,
          doc.created_at,
          ahora,
        ]
      );
    }
  }
}

// Actualizar el cloud_id asignado a un docente creado localmente
export async function actualizarCloudIdDocenteLocal(
  localId: number,
  cloudId: number
): Promise<void> {
  const db = await obtenerBaseDatos();
  await db.runAsync(
    'UPDATE docentes_local SET cloud_id = ? WHERE local_id = ?',
    [cloudId, localId]
  );
}

// ==================================================
// COLA DE SINCRONIZACIÓN (sync_pendiente)
// ==================================================

export async function agregarOperacionPendiente(
  operacion: 'CREATE' | 'UPDATE' | 'DELETE',
  localId: number | null,
  cloudId: number | null,
  payload: any
): Promise<void> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();
  const payloadStr = payload ? JSON.stringify(payload) : null;

  // CASO 1: Edición de un docente creado offline (cloud_id es NULL)
  // Estrategia: Actualizar el payload de la operación CREATE existente con el estado final acumulado
  if (operacion === 'UPDATE' && !cloudId && localId) {
    const opCreate = await db.getFirstAsync<OperacionPendiente>(
      "SELECT * FROM sync_pendiente WHERE local_id = ? AND operacion = 'CREATE'",
      [localId]
    );

    if (opCreate) {
      await db.runAsync(
        'UPDATE sync_pendiente SET payload = ?, created_at = ? WHERE id = ?',
        [payloadStr, ahora, opCreate.id]
      );
      return;
    }
  }

  // CASO 2: Múltiples UPDATE de un docente que ya existe en la nube
  // Estrategia: Last local state wins (actualizar el payload del UPDATE pendiente con el estado completo)
  if (operacion === 'UPDATE' && (cloudId || localId)) {
    const opUpdate = await db.getFirstAsync<OperacionPendiente>(
      "SELECT * FROM sync_pendiente WHERE (cloud_id = ? OR local_id = ?) AND operacion = 'UPDATE'",
      [cloudId, localId]
    );

    if (opUpdate) {
      await db.runAsync(
        'UPDATE sync_pendiente SET payload = ?, created_at = ? WHERE id = ?',
        [payloadStr, ahora, opUpdate.id]
      );
      return;
    }
  }

  // CASO 3: Eliminación offline de un docente creado offline que nunca se sincronizó
  // Estrategia: Purgar el CREATE pendiente y eliminar la fila física (nunca se envía a Supabase)
  if (operacion === 'DELETE' && !cloudId && localId) {
    await db.runAsync(
      'DELETE FROM sync_pendiente WHERE local_id = ?',
      [localId]
    );
    await eliminarDocenteLocalFisicamente(localId);
    return;
  }

  // Si ya existía un UPDATE previo de ese docente y ahora se elimina:
  if (operacion === 'DELETE') {
    if (cloudId) {
      await db.runAsync(
        "DELETE FROM sync_pendiente WHERE cloud_id = ? AND operacion = 'UPDATE'",
        [cloudId]
      );
    }
    if (localId) {
      await db.runAsync(
        "DELETE FROM sync_pendiente WHERE local_id = ? AND operacion = 'UPDATE'",
        [localId]
      );
    }
  }

  // Insertar operación normal
  await db.runAsync(
    `INSERT INTO sync_pendiente (local_id, cloud_id, operacion, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [localId, cloudId, operacion, payloadStr, ahora]
  );
}

export async function obtenerOperacionesPendientes(): Promise<OperacionPendiente[]> {
  const db = await obtenerBaseDatos();
  const rows = await db.getAllAsync<OperacionPendiente>(
    'SELECT * FROM sync_pendiente ORDER BY id ASC'
  );
  return rows;
}

export async function eliminarOperacionPendiente(id: number): Promise<void> {
  const db = await obtenerBaseDatos();
  await db.runAsync('DELETE FROM sync_pendiente WHERE id = ?', [id]);
}

// Limpiar todas las operaciones pendientes asociadas a un docente específico
export async function eliminarOperacionesPendientesDocente(
  localId: number | null,
  cloudId: number | null
): Promise<void> {
  const db = await obtenerBaseDatos();
  if (localId && cloudId) {
    await db.runAsync(
      'DELETE FROM sync_pendiente WHERE local_id = ? OR cloud_id = ?',
      [localId, cloudId]
    );
  } else if (localId) {
    await db.runAsync('DELETE FROM sync_pendiente WHERE local_id = ?', [localId]);
  } else if (cloudId) {
    await db.runAsync('DELETE FROM sync_pendiente WHERE cloud_id = ?', [cloudId]);
  }
}

// Limpiar únicamente operaciones UPDATE pendientes de un docente específico tras un UPDATE online exitoso
export async function eliminarUpdatesPendientesDocente(
  localId: number | null,
  cloudId: number | null
): Promise<void> {
  const db = await obtenerBaseDatos();
  if (localId && cloudId) {
    await db.runAsync(
      "DELETE FROM sync_pendiente WHERE (local_id = ? OR cloud_id = ?) AND operacion = 'UPDATE'",
      [localId, cloudId]
    );
  } else if (localId) {
    await db.runAsync(
      "DELETE FROM sync_pendiente WHERE local_id = ? AND operacion = 'UPDATE'",
      [localId]
    );
  } else if (cloudId) {
    await db.runAsync(
      "DELETE FROM sync_pendiente WHERE cloud_id = ? AND operacion = 'UPDATE'",
      [cloudId]
    );
  }
}
