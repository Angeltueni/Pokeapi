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
  es_nuevo: number;
  detectado_en: string | null;
};

export type OperacionPendiente = {
  id: number;
  local_id: number | null;
  cloud_id: number | null;
  operacion: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: string | null;
  created_at: string;
};

// ==================================================
// FUNCIÓN DE FIRMA / FINGERPRINT (Normalización de campos funcionales)
// ==================================================
function normalizar(valor?: string | null): string {
  return (valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function crearFirmaDocente(datos: {
  nombre?: string | null;
  cargo?: string | null;
  programa?: string | null;
  resumen?: string | null;
  pregrado?: string | null;
  posgrado?: string | null;
  experiencia?: string | null;
  imagen?: string | null;
}): string {
  return [
    normalizar(datos.nombre),
    normalizar(datos.cargo),
    normalizar(datos.programa),
    normalizar(datos.resumen),
    normalizar(datos.pregrado),
    normalizar(datos.posgrado),
    normalizar(datos.experiencia),
    normalizar(datos.imagen),
  ].join('|');
}

// ==================================================
// CONFIGURACIÓN DE INTERVALO DE MONITOREO
// ==================================================
export async function obtenerIntervaloMonitoreo(): Promise<number> {
  const db = await obtenerBaseDatos();
  const row = await db.getFirstAsync<{ valor: string }>(
    "SELECT valor FROM sync_config WHERE clave = 'docentes_polling_segundos'"
  );
  if (!row) return 10;
  const num = parseInt(row.valor, 10);
  return num === 2 || num === 10 || num === 30 ? num : 10;
}

export async function guardarIntervaloMonitoreo(
  segundos: 2 | 10 | 30
): Promise<void> {
  const db = await obtenerBaseDatos();
  await db.runAsync(
    "INSERT OR REPLACE INTO sync_config (clave, valor) VALUES ('docentes_polling_segundos', ?)",
    [segundos.toString()]
  );
}

// ==================================================
// CONTADOR Y GESTIÓN DE DOCENTES NUEVOS
// ==================================================
export async function obtenerCantidadDocentesNuevos(): Promise<number> {
  const db = await obtenerBaseDatos();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM docentes_local WHERE es_nuevo = 1 AND eliminado = 0'
  );
  return row?.total ?? 0;
}

export async function marcarDocenteComoVisto(localId: number): Promise<void> {
  const db = await obtenerBaseDatos();
  await db.runAsync(
    'UPDATE docentes_local SET es_nuevo = 0 WHERE local_id = ?',
    [localId]
  );
}

// ==================================================
// CONSULTAS LOCALES
// ==================================================
export async function obtenerDocentesLocales(): Promise<DocenteLocal[]> {
  const db = await obtenerBaseDatos();
  const rows = await db.getAllAsync<DocenteLocal>(
    'SELECT * FROM docentes_local WHERE eliminado = 0 ORDER BY local_id ASC'
  );
  return rows;
}

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

// Insertar docente en SQLite (Creado localmente, por defecto es_nuevo = 0)
export async function crearDocenteLocal(
  datos: DocenteInput,
  cloudId: number | null = null,
  esNuevo: number = 0,
  detectadoEn: string | null = null
): Promise<DocenteLocal> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();

  const resultado = await db.runAsync(
    `INSERT INTO docentes_local 
      (cloud_id, nombre, cargo, programa, resumen, pregrado, posgrado, experiencia, imagen, created_at, eliminado, updated_at, es_nuevo, detectado_en) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
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
      esNuevo,
      detectadoEn,
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
// RECONCILIACIÓN NUBE -> LOCAL CON DEDUPLICACIÓN
// ==================================================
export async function reconciliarNubeConLocal(
  docentesNube: Docente[]
): Promise<{ nuevosDetectados: number }> {
  const db = await obtenerBaseDatos();
  const ahora = new Date().toISOString();
  let nuevosDetectados = 0;

  // 1. Obtener estado actual de SQLite
  const locales = await db.getAllAsync<DocenteLocal>(
    'SELECT * FROM docentes_local WHERE eliminado = 0'
  );
  const pendientes = await obtenerOperacionesPendientes();

  // 2. CASO CRÍTICO: DEDUPLICACIÓN ANTE INSERCIÓN SIMULTÁNEA NUBE + CREATE OFFLINE
  // Identificar registros locales que tienen cloud_id = NULL y operación CREATE pendiente
  const pendingCreates = pendientes.filter((p) => p.operacion === 'CREATE');
  const cloudIdsFusionados = new Set<number>();

  for (const opCreate of pendingCreates) {
    if (!opCreate.local_id) continue;
    const localSinCloud = locales.find((l) => l.local_id === opCreate.local_id);
    if (!localSinCloud) continue;

    const firmaLocal = crearFirmaDocente(localSinCloud);

    // Buscar si algún docente devuelto por la nube tiene exactamente la misma firma funcional
    const matchNube = docentesNube.find(
      (docNube) =>
        !cloudIdsFusionados.has(docNube.id) &&
        crearFirmaDocente(docNube) === firmaLocal
    );

    if (matchNube) {
      // FUSIÓN (MERGE): El registro local mantiene su local_id y adopta el cloud_id de la nube.
      // Se elimina la operación CREATE pendiente para evitar duplicar el POST.
      await actualizarCloudIdDocenteLocal(localSinCloud.local_id, matchNube.id);
      await eliminarOperacionPendiente(opCreate.id);
      cloudIdsFusionados.add(matchNube.id);
      localSinCloud.cloud_id = matchNube.id;
    }
  }

  // 3. PROCESAR CADA DOCENTE PROVENIENTE DE LA NUBE
  for (const doc of docentesNube) {
    if (cloudIdsFusionados.has(doc.id)) {
      // Ya fue fusionado con un CREATE offline; no volver a procesar como nuevo
      continue;
    }

    const existe = locales.find((l) => l.cloud_id === doc.id);

    if (existe) {
      // Comprobar si tiene operaciones locales pendientes (UPDATE o DELETE)
      const tienePendiente = pendientes.some(
        (p) => p.cloud_id === doc.id || p.local_id === existe.local_id
      );

      // Si tiene operaciones pendientes locales: LOCAL PENDING WINS (preservar estado local)
      if (tienePendiente || existe.eliminado === 1) {
        continue;
      }

      // Sin cambios pendientes locales: CLOUD WINS (actualizar con la versión de Supabase)
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
      // Es una inserción NUEVA originada en la nube -> es_nuevo = 1
      await db.runAsync(
        `INSERT INTO docentes_local 
          (cloud_id, nombre, cargo, programa, resumen, pregrado, posgrado, experiencia, imagen, created_at, eliminado, updated_at, es_nuevo, detectado_en) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, ?)`,
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
          ahora,
        ]
      );
      nuevosDetectados++;
    }
  }

  // 4. RECONCILIAR ELIMINACIONES DIRECTAS DE NUBE (Requisito 25)
  // Si un cloud_id existía localmente pero ya no aparece en Supabase y no tiene operaciones pendientes:
  const cloudIdsEnNube = new Set(docentesNube.map((d) => d.id));
  for (const local of locales) {
    if (local.cloud_id !== null && !cloudIdsEnNube.has(local.cloud_id)) {
      const tienePendiente = pendientes.some(
        (p) => p.cloud_id === local.cloud_id || p.local_id === local.local_id
      );
      if (!tienePendiente) {
        await eliminarDocenteLocalFisicamente(local.local_id);
      }
    }
  }

  return { nuevosDetectados };
}

// Mantener compatibilidad con llamadas existentes
export async function guardarDocentesNubeEnLocal(
  docentesNube: Docente[]
): Promise<void> {
  await reconciliarNubeConLocal(docentesNube);
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
    await db.runAsync('DELETE FROM sync_pendiente WHERE local_id = ?', [localId]);
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
