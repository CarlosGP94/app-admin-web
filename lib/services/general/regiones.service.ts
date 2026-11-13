import { ConnectionPool } from "mssql";

export interface RegionRow {
  id: number;
  region: string;
}

export async function obtenerRegionesService(
  pool: ConnectionPool
): Promise<RegionRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      r.id,
      r.region
    FROM Regiones r
    ORDER BY r.region ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: Number(row.id),
    region: row.region,
  }));
}
