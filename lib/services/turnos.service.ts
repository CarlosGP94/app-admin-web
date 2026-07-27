import { ConnectionPool } from "mssql";

export interface TurnoRow {
  id: number;
  prefijo: string | null;
  entrada: string | null;
  salida: string | null;
  label: string;
}

export async function obtenerTurnosService(
  pool: ConnectionPool,
): Promise<TurnoRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      t.id,
      t.prefijo,
      t.entrada,
      t.salida,
      TRIM(
        CONCAT(
          ISNULL(t.prefijo, ''),
          CASE WHEN t.prefijo IS NOT NULL THEN ' ' ELSE '' END,
          '(',
          ISNULL(FORMAT(TRY_CAST(t.entrada AS time), 'hh\\:mm'), ISNULL(t.entrada, '')),
          ' - ',
          ISNULL(FORMAT(TRY_CAST(t.salida AS time), 'hh\\:mm'), ISNULL(t.salida, '')),
          ')'
        )
      ) AS label
    FROM Turnos t
    ORDER BY t.prefijo ASC, t.entrada ASC, t.salida ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: row.id,
    prefijo: row.prefijo ?? null,
    entrada: row.entrada ? row.entrada.toString() : null,
    salida: row.salida ? row.salida.toString() : null,
    label: row.label ?? "",
  }));
}
