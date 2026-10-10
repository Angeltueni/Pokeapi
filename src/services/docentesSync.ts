import * as Network from 'expo-network';
import {
  actualizarCloudIdDocenteLocal,
  eliminarDocenteLocalFisicamente,
  eliminarOperacionPendiente,
  guardarDocentesNubeEnLocal,
  obtenerDocenteLocalPorLocalId,
  obtenerOperacionesPendientes,
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

// Suscripción a cambios de conectividad en tiempo real
export function suscribirCambiosDeRed(
  onReconexion: () => void | Promise<void>
): () => void {
  let estabaOffline = false;

  // Registrar estado inicial
  hayConexionInternet().then((online) => {
    estabaOffline = !online;
  });

  try {
    const sub = Network.addNetworkStateListener(async (event) => {
      const online = Boolean(
        event.isConnected && event.isInternetReachable !== false
      );
      if (estabaOffline && online) {
        await onReconexion();
      }
      estabaOffline = !online;
    });

    return () => {
      sub.remove();
    };
  } catch {
    // Fallback con temporizador si el listener nativo no estuviera disponible en el entorno
    const interval = setInterval(async () => {
      const online = await hayConexionInternet();
      if (estabaOffline && online) {
        await onReconexion();
      }
      estabaOffline = !online;
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }
}

// Mutex simple para evitar sincronizaciones concurrentes
let sincronizando = false;

// Sincronización secuencial de operaciones pendientes
export async function sincronizarDocentesPendientes(): Promise<boolean> {
  if (sincronizando) {
    return false;
  }

  const online = await hayConexionInternet();
  if (!online) {
    return false;
  }

  sincronizando = true;

  try {
    const pendientes = await obtenerOperacionesPendientes();

    // Procesamiento estrictamente SECUENCIAL
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
              // Si el recurso ya fue eliminado en la nube (404), continuar limpiando la copia local
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
        console.warn('Interrupción de sincronización por error de conectividad:', error);
        // Detener la sincronización secuencial si falla la red y conservar pendientes restantes
        break;
      }
    }

    // Actualizar la copia local SQLite con la información más reciente de Supabase
    try {
      const docentesNube = await obtenerDocentes();
      await guardarDocentesNubeEnLocal(docentesNube);
    } catch {
      // Si la consulta falla, las operaciones sincronizadas ya están persistidas
    }

    return true;
  } finally {
    sincronizando = false;
  }
}
