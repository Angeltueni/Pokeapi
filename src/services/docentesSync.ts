import * as Network from 'expo-network';
import {
  actualizarCloudIdDocenteLocal,
  eliminarDocenteLocalFisicamente,
  eliminarOperacionPendiente,
  obtenerDocenteLocalPorLocalId,
  obtenerOperacionesPendientes,
  reconciliarNubeConLocal,
} from '@/database/docentesLocal';
import {
  DocenteInput,
  actualizarDocente,
  crearDocente,
  eliminarDocente,
  obtenerDocentes,
} from './docentesApi';

// Comprobar estado de conectividad real a Internet
export async function hayConexionInternet(): Promise<boolean> {
  try {
    const estado = await Network.getNetworkStateAsync();
    return Boolean(estado.isConnected && estado.isInternetReachable !== false);
  } catch {
    return false;
  }
}

// Mutex simple para evitar sincronizaciones concurrentes
let sincronizando = false;

// ==================================================
// ORQUESTADOR COMPLETO: PULL -> DEDUPLICAR -> PUSH -> PULL
// ==================================================
export async function sincronizarDocentesCompleto(): Promise<{
  exito: boolean;
  nuevosDetectados: number;
}> {
  if (sincronizando) {
    return { exito: false, nuevosDetectados: 0 };
  }

  const online = await hayConexionInternet();
  if (!online) {
    return { exito: false, nuevosDetectados: 0 };
  }

  sincronizando = true;
  let totalNuevos = 0;

  try {
    // PASO 1 & 2: Obtener docentes actuales de la nube
    let docentesNube = await obtenerDocentes();

    // PASO 3, 4 & 5: Reconciliación Nube -> Local:
    // - Deduplica registros creados offline frente a la nube ANTES de enviar CREATE
    // - Inserta nuevas inserciones externas de nube con es_nuevo = 1
    // - Actualiza registros existentes sin operaciones locales pendientes (Cloud Wins)
    // - Reconcilia eliminaciones de nube si no hay cambios locales pendientes
    const resReconciliacion = await reconciliarNubeConLocal(docentesNube);
    totalNuevos += resReconciliacion.nuevosDetectados;

    // PASO 6: Procesar secuencialmente las operaciones locales que todavía sigan pendientes
    const pendientes = await obtenerOperacionesPendientes();

    for (const op of pendientes) {
      try {
        if (op.operacion === 'CREATE') {
          if (!op.local_id) {
            await eliminarOperacionPendiente(op.id);
            continue;
          }

          const local = await obtenerDocenteLocalPorLocalId(op.local_id);
          if (!local || local.eliminado === 1) {
            await eliminarOperacionPendiente(op.id);
            continue;
          }

          const input: DocenteInput = {
            nombre: local.nombre,
            cargo: local.cargo || undefined,
            programa: local.programa || undefined,
            resumen: local.resumen || undefined,
            pregrado: local.pregrado || undefined,
            posgrado: local.posgrado || undefined,
            experiencia: local.experiencia || undefined,
            imagen: local.imagen || undefined,
          };

          const creado = await crearDocente(input);
          await actualizarCloudIdDocenteLocal(op.local_id, creado.id);
          await eliminarOperacionPendiente(op.id);
        } else if (op.operacion === 'UPDATE') {
          if (!op.cloud_id) {
            await eliminarOperacionPendiente(op.id);
            continue;
          }

          const datosUpdate = op.payload ? JSON.parse(op.payload) : {};
          await actualizarDocente(op.cloud_id, datosUpdate);
          await eliminarOperacionPendiente(op.id);
        } else if (op.operacion === 'DELETE') {
          if (op.cloud_id) {
            try {
              await eliminarDocente(op.cloud_id);
            } catch (err) {
              const mensaje = err instanceof Error ? err.message : '';
              if (!mensaje.includes('404') && !mensaje.includes('no encontrado')) {
                throw err;
              }
            }
          }

          if (op.local_id) {
            await eliminarDocenteLocalFisicamente(op.local_id);
          }
          await eliminarOperacionPendiente(op.id);
        }
      } catch (error) {
        console.warn('Interrupción al enviar pendientes por desconexión:', error);
        break;
      }
    }

    // PASO 7 & 8: Pull final de reconciliación para asegurar consistencia absoluta
    try {
      docentesNube = await obtenerDocentes();
      const resFinal = await reconciliarNubeConLocal(docentesNube);
      totalNuevos += resFinal.nuevosDetectados;
    } catch {
      // Ignorar si la última comprobación falla temporalmente
    }

    return { exito: true, nuevosDetectados: totalNuevos };
  } catch (error) {
    console.warn('Error durante sincronizarDocentesCompleto:', error);
    return { exito: false, nuevosDetectados: 0 };
  } finally {
    sincronizando = false;
  }
}

// Mantener compatibilidad con llamadas anteriores
export async function sincronizarDocentesPendientes(): Promise<boolean> {
  const res = await sincronizarDocentesCompleto();
  return res.exito;
}

// ==================================================
// SERVICIO DE POLLING PARAMETRIZABLE (2s, 10s, 30s)
// ==================================================
export function iniciarMonitoreoDocentes(
  segundos: number,
  onSincronizado: () => void | Promise<void>
): () => void {
  const ms = Math.max(2000, segundos * 1000);

  const timer = setInterval(async () => {
    // Si la sincronización previa sigue en curso o estamos offline, saltar este tick
    if (sincronizando) {
      return;
    }

    const online = await hayConexionInternet();
    if (!online) {
      return;
    }

    const resultado = await sincronizarDocentesCompleto();
    if (resultado.exito) {
      await onSincronizado();
    }
  }, ms);

  return () => {
    clearInterval(timer);
  };
}

// ==================================================
// LISTENER DE RECONEXIÓN
// ==================================================
export function suscribirCambiosDeRed(
  onReconexion: () => void | Promise<void>
): () => void {
  let estabaOffline = false;

  hayConexionInternet().then((online) => {
    estabaOffline = !online;
  });

  try {
    const sub = Network.addNetworkStateListener(async (event) => {
      const online = Boolean(
        event.isConnected && event.isInternetReachable !== false
      );
      if (estabaOffline && online) {
        await sincronizarDocentesCompleto();
        await onReconexion();
      }
      estabaOffline = !online;
    });

    return () => {
      sub.remove();
    };
  } catch {
    const interval = setInterval(async () => {
      const online = await hayConexionInternet();
      if (estabaOffline && online) {
        await sincronizarDocentesCompleto();
        await onReconexion();
      }
      estabaOffline = !online;
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }
}
