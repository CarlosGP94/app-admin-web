import { ConnectionPool } from "mssql";

export interface OperarioRow {
  id: number;
  nombre: string;
  apellido1: string | null;
  apellido2: string | null;
  label: string;
}

export async function obtenerOperariosService(
  pool: ConnectionPool,
): Promise<OperarioRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      o.id,
      o.nombre,
      o.apellido1,
      o.apellido2,
      TRIM(CONCAT_WS(' ', o.nombre, o.apellido1, o.apellido2)) AS label
    FROM Operarios o
    ORDER BY o.nombre ASC, o.apellido1 ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre ?? "",
    apellido1: row.apellido1 ?? null,
    apellido2: row.apellido2 ?? null,
    label: row.label ?? "",
  }));
}
