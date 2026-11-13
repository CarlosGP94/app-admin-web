import type { ConnectionPool } from "mssql";
import type {
  SourceRow,
  SyncEntity,
  TargetRow,
} from "@/lib/integrations/types";

const asText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  return String(value);
};

const asNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Entidad Mallas: replica Mallas_DB_Mallas (SQL Server) hacia la tabla
 * Mallas_Definicion_Local de la base SQLite externa.
 */
export const mallasEntity: SyncEntity = {
  name: "mallas",
  table: "Mallas_Definicion_Local",
  key: "id",
  columns: [
    "id",
    "codigo",
    "art_codigo",
    "designacion",
    "diametro",
    "longitudinales",
    "transversales",
    "ancho",
    "largo",
    "sl",
    "st",
    "unidades_por_paquete",
  ],
  ensureTableSql: `
    CREATE TABLE IF NOT EXISTS Mallas_Definicion_Local (
      id INTEGER PRIMARY KEY,
      codigo TEXT,
      art_codigo TEXT,
      designacion TEXT,
      diametro REAL,
      longitudinales INTEGER,
      transversales INTEGER,
      ancho INTEGER,
      largo INTEGER,
      sl REAL,
      st INTEGER,
      unidades_por_paquete INTEGER
    );
  `,
  fetchSource: async (pool: ConnectionPool): Promise<SourceRow[]> => {
    const result = await pool.request().query(`
      SELECT
        id,
        codigo,
        art_codigo,
        designacion,
        diametro,
        longitudinales,
        transversales,
        ancho,
        largo,
        sl,
        st,
        unidades_por_paquete
      FROM Mallas_DB_Mallas;
    `);

    return result.recordset as SourceRow[];
  },
  mapToTarget: (row: SourceRow): TargetRow => ({
    id: asNumber(row.id),
    codigo: asText(row.codigo),
    art_codigo: asText(row.art_codigo),
    designacion: asText(row.designacion),
    diametro: asNumber(row.diametro),
    longitudinales: asNumber(row.longitudinales),
    transversales: asNumber(row.transversales),
    ancho: asNumber(row.ancho),
    largo: asNumber(row.largo),
    sl: asNumber(row.sl),
    st: asNumber(row.st),
    unidades_por_paquete: asNumber(row.unidades_por_paquete),
  }),
};
