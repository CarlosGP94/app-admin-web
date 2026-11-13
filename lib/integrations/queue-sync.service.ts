import type { DatabaseSync } from "node:sqlite";
import { access } from "node:fs/promises";
import type { ConnectionPool } from "mssql";
import { getConnection } from "@/lib/db";
import { targetRegistry } from "@/lib/integrations/registry";
import { openSqlite } from "@/lib/integrations/sqlite/sqlite.client";
import {
  logQueueSyncError,
  logQueueSyncSummary,
} from "@/lib/integrations/sync-log.service";
import type {
  QueueSyncRunResult,
  QueueSyncStats,
} from "@/lib/integrations/types";

const COLA_TABLE = "cola_produccion";
const PRODUCCION_TABLE = "Mallas_DB_Produccion";

/**
 * Columnas que se copian desde `cola_produccion` hacia `Mallas_DB_Produccion`.
 * Se excluyen `id` (autoincremental local) y `sincronizado` (control local).
 */
const PRODUCCION_COLUMNS = [
  "turno_id",
  "malla_id",
  "paquete",
  "lote",
  "unidades",
  "sl",
  "st",
  "longitudinales",
  "transversales",
  "diametro",
  "observacion",
  "ancho",
  "largo",
  "maquina_id",
  "creado",
  "impreso",
] as const;

type ColumnaProduccion = (typeof PRODUCCION_COLUMNS)[number];
type ColaRow = Record<ColumnaProduccion | "id", unknown>;

let lock: Promise<void> = Promise.resolve();

function normalizeValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  const text = String(value).trim();
  return text === "" ? null : text;
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

/**
 * Normaliza `creado` a un literal compatible con `datetime2` conservando
 * la hora de pared (sin aplicar conversiones de zona horaria).
 */
function normalizeFecha(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return (
      `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
        value.getDate()
      )}` +
      ` ${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(
        value.getSeconds()
      )}.${pad(value.getMilliseconds(), 3)}`
    );
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeFecha(new Date(value));
  }

  const text = String(value).trim();
  if (text === "") return null;

  return text
    .replace("T", " ")
    .replace(/Z$/i, "")
    .replace(/[+-]\d{2}:?\d{2}$/, "")
    .trim();
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function rutaExiste(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function tablaExiste(db: DatabaseSync, table: string): boolean {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?"
    )
    .get(table) as { name?: string } | undefined;
  return Boolean(row?.name);
}

function leerPendientes(db: DatabaseSync): ColaRow[] {
  const columnas = ["id", ...PRODUCCION_COLUMNS].join(", ");
  const rows = db
    .prepare(
      `SELECT ${columnas} FROM ${COLA_TABLE} WHERE sincronizado = 0 ORDER BY id ASC`
    )
    .all();
  return rows as ColaRow[];
}

async function insertarEnProduccion(
  pool: ConnectionPool,
  row: ColaRow
): Promise<void> {
  const request = pool.request();
  const columnas: string[] = [];
  const parametros: string[] = [];

  for (const column of PRODUCCION_COLUMNS) {
    const value =
      column === "creado"
        ? normalizeFecha(row[column])
        : normalizeValue(row[column]);

    // Las columnas nulas se omiten para que apliquen los valores por
    // defecto de la tabla (ej: creado, impreso).
    if (value === null) continue;

    request.input(column, value);
    columnas.push(column);
    parametros.push(`@${column}`);
  }

  if (columnas.length === 0) {
    await request.query(
      `INSERT INTO ${PRODUCCION_TABLE} DEFAULT VALUES;`
    );
    return;
  }

  await request.query(
    `INSERT INTO ${PRODUCCION_TABLE} (${columnas.join(
      ", "
    )}) VALUES (${parametros.join(", ")});`
  );
}

function marcarSincronizada(db: DatabaseSync, id: unknown): void {
  db.prepare(`UPDATE ${COLA_TABLE} SET sincronizado = 1 WHERE id = ?`).run(
    id as number | bigint
  );
}

async function procesarTarget(
  pool: ConnectionPool,
  target: (typeof targetRegistry)[number]
): Promise<QueueSyncStats> {
  const stats: QueueSyncStats = {
    target: target.name,
    path: target.path,
    pending: 0,
    inserted: 0,
    failed: 0,
  };

  if (!(await rutaExiste(target.path))) {
    console.warn(
      `⚠️ No existe la base SQLite "${target.path}" (${target.name}); se omite la cola.`
    );
    return stats;
  }

  const db = openSqlite(target.path);
  try {
    if (!tablaExiste(db, COLA_TABLE)) {
      return stats;
    }

    const pendientes = leerPendientes(db);
    stats.pending = pendientes.length;

    for (const row of pendientes) {
      try {
        await insertarEnProduccion(pool, row);
        marcarSincronizada(db, row.id);
        stats.inserted += 1;
      } catch (error) {
        stats.failed += 1;
        console.error(
          `❌ No se pudo sincronizar la fila id=${String(
            row.id
          )} de ${COLA_TABLE} (${target.name}):`,
          error
        );

        await logQueueSyncError(pool, {
          target: target.name,
          path: target.path,
          colaId: row.id,
          message: errorMessage(error),
        });
      }
    }
  } finally {
    db.close();
  }

  return stats;
}

/**
 * Vacía la cola de producción (`cola_produccion`) de cada base SQLite
 * registrada, insertando las filas pendientes en `Mallas_DB_Produccion`
 * y marcándolas como sincronizadas.
 *
 * Se serializa para evitar dos ejecuciones simultáneas sobre las mismas
 * bases SQLite.
 */
export async function runProductionQueueSync(): Promise<QueueSyncRunResult> {
  let release!: () => void;
  const previous = lock;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await executeQueueSync();
  } finally {
    release();
  }
}

async function executeQueueSync(): Promise<QueueSyncRunResult> {
  const startedAt = new Date().toISOString();
  const pool = await getConnection();
  const targets: QueueSyncStats[] = [];

  for (const target of targetRegistry) {
    if (!target.enabled) continue;

    if (!target.path) {
      console.warn(
        `⚠️ Target "${target.name}" sin ruta configurada; se omite la cola.`
      );
      continue;
    }

    const targetStartedAt = new Date().toISOString();

    try {
      const stats = await procesarTarget(pool, target);
      targets.push(stats);

      await logQueueSyncSummary(pool, {
        target: target.name,
        path: target.path,
        pending: stats.pending,
        inserted: stats.inserted,
        failed: stats.failed,
        startedAt: targetStartedAt,
        finishedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        `❌ Error procesando la cola de producción de "${target.name}":`,
        error
      );
      targets.push({
        target: target.name,
        path: target.path,
        pending: 0,
        inserted: 0,
        failed: 0,
      });

      await logQueueSyncError(pool, {
        target: target.name,
        path: target.path,
        colaId: null,
        message: `Error procesando target: ${errorMessage(error)}`,
      });
    }
  }

  const finishedAt = new Date().toISOString();

  console.log(
    `✅ Cola producción ${startedAt} -> ${finishedAt}:`,
    JSON.stringify(targets)
  );

  return { startedAt, finishedAt, targets };
}
