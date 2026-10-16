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

  // 1. Tabla de docentes local
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
      updated_at TEXT,
      es_nuevo INTEGER NOT NULL DEFAULT 0,
      detectado_en TEXT
    );
  `);

  // Migración segura para bases de datos existentes: verificar si faltan columnas
  const infoColumnas = await db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(docentes_local);'
  );
  const nombresColumnas = infoColumnas.map((c) => c.name);

  if (!nombresColumnas.includes('es_nuevo')) {
    await db.execAsync(
      'ALTER TABLE docentes_local ADD COLUMN es_nuevo INTEGER NOT NULL DEFAULT 0;'
    );
  }

  if (!nombresColumnas.includes('detectado_en')) {
    await db.execAsync(
      'ALTER TABLE docentes_local ADD COLUMN detectado_en TEXT;'
    );
  }

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

  // 3. Tabla de configuración local (intervalo de monitoreo persistente)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_config (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);
}
