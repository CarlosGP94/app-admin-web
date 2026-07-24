import { ConnectionPool } from "mssql";

export interface FabricanteRow {
  id: number;
  nombre: string;
}

export async function obtenerFabricantesService(
  pool: ConnectionPool,
): Promise<FabricanteRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      f.id,
      f.nombre
    FROM Fabricantes f
    ORDER BY f.nombre ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: Number(row.id),
    nombre: String(row.nombre ?? "").trim(),
  }));
}
