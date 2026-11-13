import type { ConnectionPool } from "mssql";

const LOG_TABLE = "dbo.Mallas_DB_SyncLog";

const CREATE_LOG_TABLE_SQL = `
IF OBJECT_ID(N'${LOG_TABLE}', N'U') IS NULL
BEGIN
  CREATE TABLE ${LOG_TABLE} (
    id bigint IDENTITY(1,1) NOT NULL,
    target nvarchar(100) NOT NULL,
    ruta nvarchar(400) NULL,
    evento nvarchar(20) NOT NULL,
    cola_id bigint NULL,
    pendientes int NULL,
    insertadas int NULL,
    fallidas int NULL,
    mensaje nvarchar(max) NULL,
    iniciado_en datetime2(3) NULL,
    finalizado_en datetime2(3) NULL,
    creado datetime2(3) NOT NULL
      CONSTRAINT DF_Mallas_DB_SyncLog_creado DEFAULT (sysdatetime()),
    CONSTRAINT PK_Mallas_DB_SyncLog PRIMARY KEY CLUSTERED (id ASC)
  );
END
`;

let ensurePromise: Promise<void> | null = null;

function ensureLogTable(pool: ConnectionPool): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = pool
      .request()
      .query(CREATE_LOG_TABLE_SQL)
      .then(() => undefined)
      .catch((error) => {
        ensurePromise = null;
        throw error;
      });
  }

  return ensurePromise;
}

function toDate(value: string): Date {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function safeLog(
  pool: ConnectionPool,
  write: (pool: ConnectionPool) => Promise<unknown>
): Promise<void> {
  try {
    await ensureLogTable(pool);
    await write(pool);
  } catch (error) {
    console.error(
      `⚠️ No se pudo escribir en la tabla de log ${LOG_TABLE}:`,
      error
    );
  }
}

export interface QueueSyncSummaryLog {
  target: string;
  path: string;
  pending: number;
  inserted: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
}

/**
 * Registra un resumen por ejecución de target en la cola de producción.
 */
export async function logQueueSyncSummary(
  pool: ConnectionPool,
  data: QueueSyncSummaryLog
): Promise<void> {
  await safeLog(pool, async (currentPool) => {
    const request = currentPool.request();
    request.input("target", data.target);
    request.input("ruta", data.path);
    request.input("evento", "RESUMEN");
    request.input("pendientes", data.pending);
    request.input("insertadas", data.inserted);
    request.input("fallidas", data.failed);
    request.input("iniciado_en", toDate(data.startedAt));
    request.input("finalizado_en", toDate(data.finishedAt));

    await request.query(`
      INSERT INTO ${LOG_TABLE}
        (target, ruta, evento, pendientes, insertadas, fallidas, iniciado_en, finalizado_en)
      VALUES
        (@target, @ruta, @evento, @pendientes, @insertadas, @fallidas, @iniciado_en, @finalizado_en);
    `);
  });
}

export interface QueueSyncErrorLog {
  target: string;
  path: string;
  colaId: unknown;
  message: string;
}

/**
 * Registra una fila de error (una entrada por fila de la cola que no pudo
 * insertarse en Mallas_DB_Produccion).
 */
export async function logQueueSyncError(
  pool: ConnectionPool,
  data: QueueSyncErrorLog
): Promise<void> {
  await safeLog(pool, async (currentPool) => {
    const request = currentPool.request();
    request.input("target", data.target);
    request.input("ruta", data.path);
    request.input("evento", "ERROR");
    request.input("cola_id", toNumber(data.colaId));
    request.input("mensaje", data.message);

    await request.query(`
      INSERT INTO ${LOG_TABLE}
        (target, ruta, evento, cola_id, mensaje)
      VALUES
        (@target, @ruta, @evento, @cola_id, @mensaje);
    `);
  });
}
