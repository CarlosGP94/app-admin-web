import { DatabaseSync } from "node:sqlite";
import type {
  SqliteValue,
  SyncEntity,
  TargetRow,
} from "@/lib/integrations/types";

export interface EntityDiff {
  toInsert: TargetRow[];
  toUpdate: TargetRow[];
  toDelete: SqliteValue[];
  unchanged: number;
}

/**
 * Abre una base SQLite. El `busy_timeout` evita fallos inmediatos si
 * otro proceso la tiene bloqueada momentáneamente.
 */
export function openSqlite(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 10000;");
  return db;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function ensureTable(db: DatabaseSync, entity: SyncEntity): void {
  db.exec(entity.ensureTableSql);
}

export function readRows(
  db: DatabaseSync,
  entity: SyncEntity
): TargetRow[] {
  const table = quoteIdentifier(entity.table);
  const columns = entity.columns.map(quoteIdentifier).join(", ");
  const rows = db.prepare(`SELECT ${columns} FROM ${table}`).all();
  return rows as TargetRow[];
}

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : null;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") return value.trim();
  return String(value);
}

function rowsAreEqual(
  source: TargetRow,
  target: TargetRow,
  columns: string[]
): boolean {
  return columns.every(
    (column) => normalizeValue(source[column]) === normalizeValue(target[column])
  );
}

function keyOf(row: TargetRow, key: string): string {
  return normalizeValue(row[key]) ?? "";
}

/**
 * Calcula el diff entre las filas de origen y las existentes en destino.
 * Las filas sin cambios no se incluyen en ninguna operación.
 */
export function computeDiff(
  entity: SyncEntity,
  sourceRows: TargetRow[],
  targetRows: TargetRow[]
): EntityDiff {
  const targetByKey = new Map<string, TargetRow>();
  for (const row of targetRows) {
    targetByKey.set(keyOf(row, entity.key), row);
  }

  const seenKeys = new Set<string>();
  const toInsert: TargetRow[] = [];
  const toUpdate: TargetRow[] = [];
  let unchanged = 0;

  for (const sourceRow of sourceRows) {
    const key = keyOf(sourceRow, entity.key);
    seenKeys.add(key);

    const targetRow = targetByKey.get(key);
    if (!targetRow) {
      toInsert.push(sourceRow);
      continue;
    }

    if (rowsAreEqual(sourceRow, targetRow, entity.columns)) {
      unchanged += 1;
    } else {
      toUpdate.push(sourceRow);
    }
  }

  const toDelete = targetRows
    .filter((row) => !seenKeys.has(keyOf(row, entity.key)))
    .map((row) => row[entity.key]);

  return { toInsert, toUpdate, toDelete, unchanged };
}

/**
 * Aplica el diff en una única transacción para que el destino quede
 * consistente (todo o nada).
 */
export function applyDiff(
  db: DatabaseSync,
  entity: SyncEntity,
  diff: EntityDiff
): void {
  const table = quoteIdentifier(entity.table);
  const key = quoteIdentifier(entity.key);
  const nonKeyColumns = entity.columns.filter(
    (column) => column !== entity.key
  );

  const insertSql = `
    INSERT INTO ${table} (${entity.columns.map(quoteIdentifier).join(", ")})
    VALUES (${entity.columns.map(() => "?").join(", ")})
  `;
  const updateSql = `
    UPDATE ${table}
    SET ${nonKeyColumns.map((column) => `${quoteIdentifier(column)} = ?`).join(", ")}
    WHERE ${key} = ?
  `;
  const deleteSql = `DELETE FROM ${table} WHERE ${key} = ?`;

  db.exec("BEGIN IMMEDIATE");
  try {
    if (diff.toInsert.length > 0) {
      const statement = db.prepare(insertSql);
      for (const row of diff.toInsert) {
        statement.run(
          ...entity.columns.map((column) => row[column] ?? null)
        );
      }
    }

    if (diff.toUpdate.length > 0) {
      const statement = db.prepare(updateSql);
      for (const row of diff.toUpdate) {
        statement.run(
          ...nonKeyColumns.map((column) => row[column] ?? null),
          row[entity.key] ?? null
        );
      }
    }

    if (diff.toDelete.length > 0) {
      const statement = db.prepare(deleteSql);
      for (const value of diff.toDelete) {
        statement.run(value ?? null);
      }
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
