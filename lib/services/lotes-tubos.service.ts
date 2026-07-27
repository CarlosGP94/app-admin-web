import { ConnectionPool } from "mssql";

export interface LoteTuboRow {
  id: number;
  lote: string | null;
  creado: string;
}

export async function obtenerLotesTubosService(
  pool: ConnectionPool,
  fecha?: string,
  maquinaId?: number,
): Promise<LoteTuboRow[]> {
  const req = pool.request();
  const conditions: string[] = [];

  // Filtro por fecha (YYYY-MM-DD)
  if (fecha) {
    const fechaLimpia = fecha.split("T")[0];
    req.input("fecha", fechaLimpia);
    conditions.push("CAST(l.creado AS DATE) = CAST(@fecha AS DATE)");
  }

  // Filtro por máquina
  if (maquinaId && !isNaN(maquinaId)) {
    req.input("maquina_id", maquinaId);
    conditions.push("l.maquina_id = @maquina_id");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT 
      l.id,
      l.lote,
      l.creado
    FROM Lotes_Tubos l
    ${whereClause}
    ORDER BY l.creado DESC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  return rows.map((row) => ({
    id: row.id,
    lote: row.lote ?? null,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
  }));
}
