import { ConnectionPool } from "mssql";

export interface MaquinaRow {
  id: number;
  maquina: string;
}

export async function obtenerMaquinasService(
  pool: ConnectionPool,
): Promise<MaquinaRow[]> {
  const req = pool.request();

  const query = `
    SELECT 
      m.id,
      m.maquina
    FROM Maquinas m
    ORDER BY m.maquina ASC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: row.id,
    maquina: row.maquina,
  }));
}
