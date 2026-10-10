import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function obtenerBaseDatos(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('pokeanime.db');
  }
  return dbInstance;
}

export async function inicializarBaseLocal(): Promise<void> {
  const db = await obtenerBaseDatos();

  // 1. Tabla de docentes local (con soporte de cloud_id e indicador de eliminado)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS docentes_local (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      cloud_id INTEGER UNIQUE,
      nombre TEXT NOT NULL,
      cargo TEXT,
      programa TEXT,
      resumen TEXT,
      pregrado TEXT,
      posgrado TEXT,
      experiencia TEXT,
      imagen TEXT,
      created_at TEXT,
      eliminado INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT
    );
  `);

  // 2. Tabla de operaciones pendientes de sincronización
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_pendiente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_id INTEGER,
      cloud_id INTEGER,
      operacion TEXT NOT NULL,
      payload TEXT,
      created_at TEXT
    );
  `);
}
