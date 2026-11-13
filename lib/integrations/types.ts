import type { ConnectionPool } from "mssql";

export type SqliteValue = string | number | bigint | null;

export type SourceRow = Record<string, unknown>;

export type TargetRow = Record<string, SqliteValue>;

/**
 * Definición de una entidad sincronizable hacia una base externa.
 * Cada entidad conoce cómo leer su origen (SQL Server) y cómo mapear
 * una fila al formato de la tabla destino.
 */
export interface SyncEntity {
  /** Nombre lógico de la entidad (ej: "mallas"). */
  name: string;
  /** Nombre exacto de la tabla en la base externa. */
  table: string;
  /** Columna usada como llave para comparar origen y destino. */
  key: string;
  /** Columnas sincronizadas. Debe incluir la llave. */
  columns: string[];
  /** DDL para asegurar que la tabla exista en destino. */
  ensureTableSql: string;
  /** Obtiene todas las filas desde la base de datos de origen. */
  fetchSource: (pool: ConnectionPool) => Promise<SourceRow[]>;
  /** Transforma una fila de origen al formato de la tabla destino. */
  mapToTarget: (row: SourceRow) => TargetRow;
}

/**
 * Destino externo. Para agregar otra base SQLite basta con añadir
 * otro elemento a `targetRegistry` en `registry.ts`.
 */
export interface SqliteTarget {
  name: string;
  enabled: boolean;
  driver: "sqlite";
  path: string;
  entities: SyncEntity[];
}

export interface EntitySyncStats {
  entity: string;
  source: number;
  inserted: number;
  updated: number;
  deleted: number;
  unchanged: number;
}

export interface TargetSyncStats {
  target: string;
  path: string;
  entities: EntitySyncStats[];
}

export interface SyncRunResult {
  startedAt: string;
  finishedAt: string;
  targets: TargetSyncStats[];
}

/**
 * Estadísticas del vaciado de la cola de producción local
 * (`cola_produccion`) hacia SQL Server.
 */
export interface QueueSyncStats {
  target: string;
  path: string;
  /** Filas pendientes encontradas (sincronizado = 0). */
  pending: number;
  /** Filas insertadas correctamente en Mallas_DB_Produccion. */
  inserted: number;
  /** Filas que fallaron al insertarse y quedaron pendientes. */
  failed: number;
}

export interface QueueSyncRunResult {
  startedAt: string;
  finishedAt: string;
  targets: QueueSyncStats[];
}
