import { ConnectionPool } from "mssql";

export interface TipoTuboRow {
  id: number;
  nombre: string;
  creado: string;
  prefijo: string | null;
  medida: string | null;
}

export async function obtenerTiposTubosService(
  pool: ConnectionPool,
): Promise<TipoTuboRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      t.id,
      t.nombre,
      t.creado,
      t.prefijo,
      t.medida
    FROM Tipos_Tubos t
    ORDER BY t.nombre ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
    prefijo: row.prefijo ?? null,
    medida: row.medida ?? null,
  }));
}
