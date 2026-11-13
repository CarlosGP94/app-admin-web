import { getConnection } from "@/lib/db";
import { targetRegistry } from "@/lib/integrations/registry";
import {
  applyDiff,
  computeDiff,
  ensureTable,
  openSqlite,
  readRows,
} from "@/lib/integrations/sqlite/sqlite.client";
import type {
  EntitySyncStats,
  SyncRunResult,
  TargetSyncStats,
} from "@/lib/integrations/types";

let lock: Promise<void> = Promise.resolve();

/**
 * Serializa las sincronizaciones para que dos ejecuciones no compitan
 * por la misma base SQLite.
 */
export async function runIntegrationSync(): Promise<SyncRunResult> {
  let release!: () => void;
  const previous = lock;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await executeSync();
  } finally {
    release();
  }
}

/**
 * Dispara una sincronización en segundo plano sin bloquear la petición
 * que la originó (por ejemplo, tras crear/editar una malla).
 */
export function queueIntegrationSync(): void {
  void runIntegrationSync().catch((error) => {
    console.error("❌ Error en sincronización de integraciones:", error);
  });
}

async function executeSync(): Promise<SyncRunResult> {
  const startedAt = new Date().toISOString();
  const pool = await getConnection();
  const targets: TargetSyncStats[] = [];

  for (const target of targetRegistry) {
    if (!target.enabled) continue;

    if (!target.path) {
      console.warn(
        `⚠️ Target "${target.name}" sin ruta configurada; se omite.`
      );
      continue;
    }

    const db = openSqlite(target.path);
    try {
      const entities: EntitySyncStats[] = [];

      for (const entity of target.entities) {
        ensureTable(db, entity);

        const sourceRows = await entity.fetchSource(pool);
        const mappedSource = sourceRows
          .map((row) => entity.mapToTarget(row))
          .filter(
            (row) =>
              row[entity.key] !== null && row[entity.key] !== undefined
          );

        const targetRows = readRows(db, entity);
        const diff = computeDiff(entity, mappedSource, targetRows);
        applyDiff(db, entity, diff);

        entities.push({
          entity: entity.name,
          source: mappedSource.length,
          inserted: diff.toInsert.length,
          updated: diff.toUpdate.length,
          deleted: diff.toDelete.length,
          unchanged: diff.unchanged,
        });
      }

      targets.push({
        target: target.name,
        path: target.path,
        entities,
      });
    } finally {
      db.close();
    }
  }

  const finishedAt = new Date().toISOString();
  console.log(
    `✅ Sync integraciones ${startedAt} -> ${finishedAt}:`,
    JSON.stringify(targets)
  );

  return { startedAt, finishedAt, targets };
}
