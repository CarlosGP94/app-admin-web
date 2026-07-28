import { ConnectionPool, Request } from "mssql";

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

export interface FiltrosLotes {
  lote?: string;
  maquinaId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  buscar?: string;
}

export interface ListarLotesParams {
  page?: number;
  pageSize?: number;
  orderBy?: "id" | "lote" | "creado" | "maquina";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosLotes;
}

export interface LoteRow {
  id: number;
  fecha: string;
  lote: string;
  maquina_id: number;
  maquina: string;
  action_id: number;
}

export interface ListarLotesResponse {
  data: LoteRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar los Lotes de Tubos
 */
export async function listarLotesTubosService(
  pool: ConnectionPool,
  params: ListarLotesParams,
): Promise<ListarLotesResponse> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

  // Cálculo de límites para el BETWEEN (basado en indexación 1)
  const rowStart = (page - 1) * pageSize + 1;
  const rowEnd = page * pageSize;

  const { filtros, orderBy, orderDir = "DESC" } = params;
  const req = pool.request();

  // 1. Construcción dinámica de Cláusulas WHERE
  let whereClauses = "WHERE 1=1";

  if (filtros?.lote) {
    whereClauses += " AND p.lote LIKE @lote";
    req.input("lote", `%${filtros.lote}%`);
  }

  if (filtros?.maquinaId) {
    whereClauses += " AND p.maquina_id = @maquinaId";
    req.input("maquinaId", filtros.maquinaId);
  }

  if (filtros?.fechaInicio) {
    whereClauses += " AND p.creado >= @fechaInicio";
    req.input("fechaInicio", filtros.fechaInicio);
  }

  if (filtros?.fechaFin) {
    whereClauses += " AND p.creado <= @fechaFin";
    req.input("fechaFin", filtros.fechaFin);
  }

  if (filtros?.buscar) {
    whereClauses += " AND (p.lote LIKE @buscar OR m.maquina LIKE @buscar)";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  // 2. Determinar el orden seguro para inyectar en ROW_NUMBER()
  let safeOrderBySql = "";

  if (orderBy) {
    const columnasPermitidas = {
      id: "p.id",
      lote: "p.lote",
      creado: "p.creado",
      maquina: "m.maquina",
    };
    const dir = orderDir.toUpperCase() === "ASC" ? "ASC" : "DESC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    safeOrderBySql = "p.id DESC"; // Orden por defecto estándar
  }

  // 3. Query paginada haciendo INNER JOIN / LEFT JOIN con la tabla Maquinas
  const query = `
    WITH LotesPaginados AS (
        SELECT
            p.id,
            p.creado,
            p.lote,
            p.maquina_id,
            m.maquina AS nombre_maquina,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Lotes_Tubos p
        LEFT JOIN Maquinas m ON p.maquina_id = m.id
        ${whereClauses}
    )
    SELECT *
    FROM LotesPaginados
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  req.input("rowStart", rowStart);
  req.input("rowEnd", rowEnd);

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  const total = rows.length > 0 ? rows[0].TotalCount : 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      action_id: row.id,
      fecha: row.creado ? new Date(row.creado).toISOString() : "",
      lote: row.lote,
      maquina_id: row.maquina_id,
      maquina: row.nombre_maquina || "",
    })),
    total,
    page,
    pageSize,
  };
}

export interface FiltrosLotesParams {
  filtros?: {
    lote?: string;
    maquinaId?: number;
    fechaInicio?: string;
    fechaFin?: string;
    buscar?: string;
  };
}

export interface ListarFiltrosLotesResponse {
  maquinas: Array<{ id: number; nombre: string }>;
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

/**
 * Servicio para obtener los selectores dinámicos y rangos de filtros para los Lotes de Tubos
 */
export async function listarFiltrosLotesTubosService(
  pool: ConnectionPool,
  params: FiltrosLotesParams,
): Promise<ListarFiltrosLotesResponse> {
  const { filtros } = params;

  const maquinaId = filtros?.maquinaId;
  const fechaInicio = filtros?.fechaInicio;
  const fechaFin = filtros?.fechaFin;
  const lote = filtros?.lote;
  const buscar = filtros?.buscar;

  const reqMaquinas = pool.request();
  const reqFechas = pool.request();

  // Helper para aplicar los filtros comunes cruzados
  const aplicarFiltrosComunes = (req: Request, omitir: string) => {
    let sql = "";

    if (maquinaId && omitir !== "maquina") {
      sql += " AND p.maquina_id = @maquinaId";
      req.input("maquinaId", maquinaId);
    }

    if (fechaInicio && omitir !== "fechas") {
      sql += " AND p.creado >= @fechaInicio";
      req.input("fechaInicio", fechaInicio);
    }

    if (fechaFin && omitir !== "fechas") {
      sql += " AND p.creado <= @fechaFin";
      req.input("fechaFin", fechaFin);
    }

    if (lote) {
      sql += " AND p.lote LIKE @lote";
      req.input("lote", `%${lote}%`);
    }

    if (buscar) {
      sql += " AND (p.lote LIKE @buscar OR m.maquina LIKE @buscar)";
      req.input("buscar", `%${buscar}%`);
    }

    return sql;
  };

  // --- QUERY 1: MÁQUINAS DISPONIBLES ---
  const whereMaquinas =
    "WHERE 1=1" + aplicarFiltrosComunes(reqMaquinas, "maquina");
  const qMaquinas = `
    SELECT DISTINCT m.id, m.maquina AS nombre
    FROM Lotes_Tubos p
    INNER JOIN Maquinas m ON p.maquina_id = m.id
    ${whereMaquinas}
    ORDER BY m.maquina ASC;
  `;

  // --- QUERY 2: RANGO DE FECHAS (MIN / MAX) ---
  const whereFechas = "WHERE 1=1" + aplicarFiltrosComunes(reqFechas, "fechas");
  const qFechas = `
    SELECT 
      MIN(p.creado) AS minFecha,
      MAX(p.creado) AS maxFecha
    FROM Lotes_Tubos p
    LEFT JOIN Maquinas m ON p.maquina_id = m.id
    ${whereFechas};
  `;

  // Ejecución paralela en el Connection Pool
  const [resMaquinas, resFechas] = await Promise.all([
    reqMaquinas.query(qMaquinas),
    reqFechas.query(qFechas),
  ]);

  const minFechaRaw = resFechas.recordset[0]?.minFecha;
  const maxFechaRaw = resFechas.recordset[0]?.maxFecha;

  return {
    maquinas: resMaquinas.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre,
    })),
    rangoFechas: {
      minFecha: minFechaRaw ? new Date(minFechaRaw).toISOString() : null,
      maxFecha: maxFechaRaw ? new Date(maxFechaRaw).toISOString() : null,
    },
  };
}

// --- TIPOS MAPPED AL COMPONENTE ---
export interface FlejeDetalle {
  id: number;
  lote: string;

  // Real
  bobina_id: number;
  bobina_concepto: string;
  colada_id: number;
  colada_nombre: string;

  // Auditado
  auditoria_id: number | null;
  bobina_auditoria_id: number | null;
  bobina_auditoria_concepto: string | null;
  colada_auditoria_id: number | null;
  colada_auditoria_nombre: string | null;
}

export interface LoteTuboConFlejes {
  id: number;
  lote: string;
  maquina: string;
  fecha: string;
  flejes: FlejeDetalle[];
}

/**
 * Servicio para obtener los Lotes de Tubos con sus Flejes asociados
 * (incluye lotes sin flejes asignados) y sus datos de auditoría.
 */
export async function obtenerLotesTubosConFlejesService(
  pool: ConnectionPool,
  loteTuboIds: number[],
): Promise<LoteTuboConFlejes[]> {
  console.log("obtenerLotesTubosConFlejesService - loteTuboIds:", loteTuboIds);
  if (!loteTuboIds || loteTuboIds.length === 0) {
    return [];
  }

  const req = pool.request();

  // Construcción de parámetros dinámicos (@id0, @id1, ...) para evitar Inyección SQL
  const idParams = loteTuboIds.map((id, index) => {
    const paramName = `id${index}`;
    req.input(paramName, id);
    return `@${paramName}`;
  });

  const query = `
    SELECT
      -- Datos del Lote de Tubo
      lt.id AS lote_tubo_id,
      lt.lote AS lote_tubo_nombre,
      lt.creado AS lote_tubo_fecha,
      m.maquina AS maquina_nombre,

      -- Datos del Fleje (Lotes_Flejes)
      lf.id AS fleje_id,
      lf.lote AS fleje_lote,

      -- Datos Reales (Bobina Cortada / Colada)
      bc.id AS real_bobina_id,
      b_real.concepto AS real_bobina_concepto,
      col_real.id AS real_colada_id,
      col_real.colada AS real_colada_nombre,

      -- Datos de Auditoría
      ab.id AS auditoria_id,
      b_aud.id AS auditoria_bobina_id,
      b_aud.numero AS auditoria_bobina_concepto,
      b_col_aud.id AS auditoria_colada_id,
      b_col_aud.colada AS auditoria_colada_nombre

    FROM Lotes_Tubos lt
    LEFT JOIN Maquinas m ON lt.maquina_id = m.id

    -- CAMBIO AQUI: LEFT JOIN para incluir lotes sin flejes
    LEFT JOIN lotes_flejes_Tubos lft ON lt.id = lft.lote_tubo_id
    LEFT JOIN Lotes_Flejes lf ON lft.lote_fleje_id = lf.id
    
    -- Relaciones para obtener Bobina y Colada Real
    LEFT JOIN Bobinas_Cortadas bc ON lf.bobina_cortada_id = bc.id
    LEFT JOIN Bobinas b_real ON bc.bobina_id = b_real.id
    LEFT JOIN Bobina_Coladas col_real ON lf.colada_id = col_real.id

    -- Relaciones para obtener Auditoría (si existe)
    LEFT JOIN Auditoria_Bobinas ab ON lf.auditoria_id = ab.id
    LEFT JOIN Bobinas_Cortadas b_aud ON ab.bobina_id = b_aud.id
    LEFT JOIN Bobina_Coladas b_col_aud ON ab.colada_id = b_col_aud.id

    WHERE lt.id IN (${idParams.join(", ")})
    ORDER BY lt.creado DESC, lf.id DESC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  // Agrupación de filas SQL (1 Nivel Lote -> N Niveles Flejes)
  const lotesMap = new Map<number, LoteTuboConFlejes>();

  for (const row of rows) {
    if (!lotesMap.has(row.lote_tubo_id)) {
      lotesMap.set(row.lote_tubo_id, {
        id: row.lote_tubo_id,
        lote: row.lote_tubo_nombre ?? "",
        maquina: row.maquina_nombre ?? "",
        fecha: row.lote_tubo_fecha
          ? new Date(row.lote_tubo_fecha).toISOString()
          : "",
        flejes: [],
      });
    }

    const loteActual = lotesMap.get(row.lote_tubo_id)!;

    // Solo añadimos el fleje si row.fleje_id NO es null o undefined
    if (row.fleje_id) {
      const yaExisteFleje = loteActual.flejes.some(
        (f) => f.id === row.fleje_id,
      );

      if (!yaExisteFleje) {
        loteActual.flejes.push({
          id: row.fleje_id,
          lote: row.fleje_lote ?? "",

          // Datos reales
          bobina_id: row.real_bobina_id ?? 0,
          bobina_concepto: row.real_bobina_concepto
            ? String(row.real_bobina_concepto)
            : "",
          colada_id: row.real_colada_id ?? 0,
          colada_nombre: row.real_colada_nombre ?? "",

          // Datos de Auditoría
          auditoria_id: row.auditoria_id ?? null,
          bobina_auditoria_id: row.auditoria_bobina_id ?? null,
          bobina_auditoria_concepto: row.auditoria_bobina_concepto
            ? String(row.auditoria_bobina_concepto)
            : null,
          colada_auditoria_id: row.auditoria_colada_id ?? null,
          colada_auditoria_nombre: row.auditoria_colada_nombre ?? null,
        });
      }
    }
  }

  return Array.from(lotesMap.values());
}
