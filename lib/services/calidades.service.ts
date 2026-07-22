import { ConnectionPool } from "mssql";

export interface CalidadTuboRow {
  id: number;
  nombre: string;
  creado: string;
  label_bobina: string | null;
  label_fleje: string | null;
  label_tubo: string | null;
  mostrar_tubos: number | null;
}

export async function obtenerCalidadesTubosService(
  pool: ConnectionPool,
): Promise<CalidadTuboRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      c.id,
      c.nombre,
      c.creado,
      c.label_bobina,
      c.label_fleje,
      c.label_tubo,
      c.mostrar_tubos
    FROM Tipos_Calidad c
    WHERE c.mostrar_tubos = 1
    ORDER BY c.nombre ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
    label_bobina: row.label_bobina ?? null,
    label_fleje: row.label_fleje ?? null,
    label_tubo: row.label_tubo ?? null,
    mostrar_tubos: row.mostrar_tubos ?? null,
  }));
}
