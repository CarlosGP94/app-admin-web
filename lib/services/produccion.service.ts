// lib/services/prod-tubos.service.ts
import type { ConnectionPool } from "mssql";

export interface FiltrosProdTubos {
  busqueda?: string;
  turno?: number;
  operario?: number;
  espesor?: number;
  calidad?: number;
  estructural?: boolean;
  maquina?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarProdTubosParams {
  filtros?: FiltrosProdTubos;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

export interface MaquinaItem {
  id: number;
  maquina: string;
}

export interface ProdTubo {
  id: number;
  tubo: string;
  lote: string;
  turno_prefijo: string;
  operario: string;
  maquinas: MaquinaItem[];
  tubos_buenos: number;
  tubos_malos: number;
  paquetes: number;
  paquete_incompleto: number;
  action_id: number;
  fecha: Date | string;
}

interface ProdTuboRawResponse {
  id: number;
  tubo_concepto: string;
  lote_codigo: string;
  turno_prefijo: string;
  operario_completo: string;
  maquinas_raw: string;
  tubos_buenos: number;
  tubos_malos: number;
  paquetes: number;
  paquete_incompleto: number;
  creado: Date;
  TotalCount: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listarProdTubosService(
  pool: ConnectionPool,
  params: ListarProdTubosParams,
): Promise<PaginatedResult<ProdTubo>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 10);

  const rowStart = (page - 1) * limit + 1;
  const rowEnd = page * limit;

  const orderCol = params.orderBy || "id";
  const orderDir = params.orderDir === "ASC" ? "ASC" : "DESC";

  const request = pool.request();
  const whereClauses: string[] = [];

  if (params.filtros) {
    const {
      busqueda,
      turno,
      operario,
      maquina,
      espesor,
      calidad,
      estructural,
      fechaInicio,
      fechaFin,
    } = params.filtros;

    if (busqueda) {
      whereClauses.push(
        `(t.concepto LIKE @busqueda OR lt.lote LIKE @busqueda)`,
      );
      request.input("busqueda", `%${busqueda}%`);
    }
    if (turno !== undefined && turno !== null && turno !== 0) {
      whereClauses.push(`pt.turno_id = @turno`);
      request.input("turno", turno);
    }
    if (operario !== undefined && operario !== null && operario !== 0) {
      whereClauses.push(`pt.operario_id = @operario`);
      request.input("operario", operario);
    }
    if (calidad !== undefined && calidad !== null && calidad !== 0) {
      whereClauses.push(`t.calidad_id = @calidad`);
      request.input("calidad", calidad);
    }
    if (espesor !== undefined && espesor !== null && espesor !== 0) {
      whereClauses.push(`t.espesor = @espesor`);
      request.input("espesor", espesor);
    }
    if (espesor !== undefined && espesor !== null && espesor !== 0) {
      whereClauses.push(`t.espesor = @espesor`);
      request.input("espesor", espesor);
    }
    if (estructural !== undefined) {
      whereClauses.push(`t.tipo_id != 3 AND t.tipo_id != 4 AND t.espesor > 2`);
      request.input("estructural", estructural);
    }
    if (maquina !== undefined && maquina !== null && maquina !== 0) {
      whereClauses.push(
        `EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquina)`,
      );
      request.input("maquina", maquina);
    }
    if (fechaInicio) {
      whereClauses.push(`pt.creado >= @fechaInicio`);
      request.input("fechaInicio", fechaInicio);
    }
    if (fechaFin) {
      whereClauses.push(`pt.creado <= @fechaFin`);
      request.input("fechaFin", fechaFin);
    }
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Mapeo seguro de columnas para el ORDER BY dinámico
  const mapeoColumnas: Record<string, string> = {
    id: "pt.id",
    tubo: "t.concepto",
    lote: "lt.lote",
    turno_prefijo: "tu.prefijo",
    operario: "o.nombre",
    fecha: "pt.creado",
    tubos_buenos: "pt.tubos_buenos",
    tubos_malos: "pt.tubos_malos",
  };

  const safeOrderCol = mapeoColumnas[orderCol] || "pt.id";

  const query = `
    WITH ProdTubosPaginados AS (
        SELECT
            pt.id,
            t.art_concepto AS tubo_concepto,
            lt.lote AS lote_codigo,
            tu.prefijo AS turno_prefijo,
            o.nombre + ' ' + o.apellido1 + ' ' + o.apellido2 AS operario_completo,
            pt.cant_tubos_buenos as tubos_buenos,
            pt.cant_tubos_malos as tubos_malos,
            pt.paquetes,
            (pt.cant_tubos_buenos - (pt.paquetes * t.num_por_paq)) AS paquete_incompleto,
            pt.creado,
            (
               SELECT STRING_AGG(CAST(m.id AS VARCHAR) + ':' + m.maquina, ',')
               FROM Tubos_Maquinas tm
               INNER JOIN Maquinas m ON tm.maquina_id = m.id
               WHERE tm.tubo_id = pt.id
            ) AS maquinas_raw,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderCol} ${orderDir}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Prod_Tubos AS pt
        LEFT JOIN Tubos AS t ON pt.tubo_id = t.id
        LEFT JOIN Lotes_Tubos AS lt ON pt.lote_tubo_id = lt.id
        LEFT JOIN Turnos AS tu ON pt.turno_id = tu.id
        LEFT JOIN Operarios AS o ON pt.operario_id = o.id
        ${whereSql}
    )
    SELECT *
    FROM ProdTubosPaginados
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  request.input("rowStart", rowStart);
  request.input("rowEnd", rowEnd);

  const result = await request.query(query);

  // 4. Mapeo y formateo final de los registros a la interfaz requerida
  const data: ProdTubo[] = result.recordset.map((row: ProdTuboRawResponse) => {
    // Parseo seguro del string de máquinas agrupadas "1:Cortadora,2:Prensa"
    const maquinas: MaquinaItem[] = row.maquinas_raw
      ? row.maquinas_raw.split(",").map((item) => {
          const [idStr, name] = item.split(":");
          return { id: Number(idStr), maquina: name };
        })
      : [];

    return {
      id: row.id,
      tubo: row.tubo_concepto || "",
      lote: row.lote_codigo || "",
      turno_prefijo: row.turno_prefijo || "",
      operario: row.operario_completo || "",
      maquinas: maquinas,
      tubos_buenos: row.tubos_buenos || 0,
      tubos_malos: row.tubos_malos || 0,
      paquetes: row.paquetes || 0,
      paquete_incompleto: row.paquete_incompleto || 0,
      action_id: row.id,
      fecha: row.creado,
    };
  });

  const total = result.recordset[0]?.TotalCount || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}

export interface FiltrosProdTubosDinámicos {
  calidadId?: number;
  turnoId?: number;
  maquinaId?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarFiltrosProdTubosParams {
  filtros?: FiltrosProdTubosDinámicos;
}

export interface ListarFiltrosProdTubosResponse {
  calidades: { id: number; calidad: string }[];
  turnos: { id: number; prefijo: string }[];
  maquinas: { id: number; maquina: string }[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

export async function listarFiltrosProdTubosService(
  pool: ConnectionPool,
  params: ListarFiltrosProdTubosParams,
): Promise<ListarFiltrosProdTubosResponse> {
  const { filtros } = params;
  const calidadId = filtros?.calidadId;
  const turnoId = filtros?.turnoId;
  const maquinaId = filtros?.maquinaId;
  const fechaInicio = filtros?.fechaInicio;
  const fechaFin = filtros?.fechaFin;

  const reqCalidades = pool.request();
  const reqTurnos = pool.request();
  const reqMaquinas = pool.request();
  const reqFechas = pool.request();

  // --- QUERY 1: CALIDADES ---
  let whereCalidades = "WHERE 1=1";
  if (turnoId) {
    whereCalidades += " AND pt.turno_id = @turnoId";
    reqCalidades.input("turnoId", turnoId);
  }
  if (maquinaId) {
    whereCalidades +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqCalidades.input("maquinaId", maquinaId);
  }
  if (fechaInicio) {
    whereCalidades += " AND pt.creado >= @fechaInicio";
    reqCalidades.input("fechaInicio", fechaInicio);
  }
  if (fechaFin) {
    whereCalidades += " AND pt.creado <= @fechaFin";
    reqCalidades.input("fechaFin", fechaFin);
  }
  const qCalidades = `
  SELECT DISTINCT tc.id, tc.nombre as calidad
  FROM Prod_Tubos pt
  INNER JOIN Tubos t ON pt.tubo_id = t.id
  INNER JOIN Tipos_Calidad tc ON t.calidad_id = tc.id
  ${whereCalidades}
  ORDER BY tc.nombre ASC; 
`;

  // --- QUERY 2: TURNOS ---
  let whereTurnos = "WHERE 1=1";
  if (calidadId) {
    whereTurnos += " AND t.calidad_id = @calidadId";
    reqTurnos.input("calidadId", calidadId);
  }
  if (maquinaId) {
    whereTurnos +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqTurnos.input("maquinaId", maquinaId);
  }
  if (fechaInicio) {
    whereTurnos += " AND pt.creado >= @fechaInicio";
    reqTurnos.input("fechaInicio", fechaInicio);
  }
  if (fechaFin) {
    whereTurnos += " AND pt.creado <= @fechaFin";
    reqTurnos.input("fechaFin", fechaFin);
  }

  const qTurnos = `
    SELECT DISTINCT tu.id, tu.prefijo
    FROM Prod_Tubos pt
    INNER JOIN Turnos tu ON pt.turno_id = tu.id
    LEFT JOIN Tubos t ON pt.tubo_id = t.id
    ${whereTurnos}
    ORDER BY tu.prefijo ASC;
  `;

  // --- QUERY 3: MÁQUINAS ---
  let whereMaquinas = "WHERE 1=1";
  if (calidadId) {
    whereMaquinas += " AND t.calidad_id = @calidadId";
    reqMaquinas.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereMaquinas += " AND pt.turno_id = @turnoId";
    reqMaquinas.input("turnoId", turnoId);
  }
  if (fechaInicio) {
    whereMaquinas += " AND pt.creado >= @fechaInicio";
    reqMaquinas.input("fechaInicio", fechaInicio);
  }
  if (fechaFin) {
    whereMaquinas += " AND pt.creado <= @fechaFin";
    reqMaquinas.input("fechaFin", fechaFin);
  }

  const qMaquinas = `
    SELECT DISTINCT m.id, m.maquina
    FROM Prod_Tubos pt
    INNER JOIN Tubos t ON pt.tubo_id = t.id
    INNER JOIN Tubos_Maquinas tm ON t.id = tm.tubo_id
    INNER JOIN Maquinas m ON tm.maquina_id = m.id
    ${whereMaquinas}
    ORDER BY m.maquina ASC;
  `;

  // --- QUERY 4: RANGO DE FECHAS ---
  let whereFechas = "WHERE 1=1";
  if (calidadId) {
    whereFechas += " AND t.calidad_id = @calidadId";
    reqFechas.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereFechas += " AND pt.turno_id = @turnoId";
    reqFechas.input("turnoId", turnoId);
  }
  if (maquinaId) {
    whereFechas +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqFechas.input("maquinaId", maquinaId);
  }

  const qFechas = `
    SELECT 
      MIN(pt.creado) AS minFecha, 
      MAX(pt.creado) AS maxFecha
    FROM Prod_Tubos pt
    LEFT JOIN Tubos t ON pt.tubo_id = t.id
    ${whereFechas};
  `;

  // Ejecución en paralelo
  const [resCalidades, resTurnos, resMaquinas, resFechas] = await Promise.all([
    reqCalidades.query(qCalidades),
    reqTurnos.query(qTurnos),
    reqMaquinas.query(qMaquinas),
    reqFechas.query(qFechas),
  ]);

  return {
    calidades: resCalidades.recordset.map((row) => ({
      id: row.id,
      calidad: row.calidad,
    })),
    turnos: resTurnos.recordset.map((row) => ({
      id: row.id,
      prefijo: row.prefijo,
    })),
    maquinas: resMaquinas.recordset.map((row) => ({
      id: row.id,
      maquina: row.maquina,
    })),
    rangoFechas: {
      minFecha: resFechas.recordset[0]?.minFecha || null,
      maxFecha: resFechas.recordset[0]?.maxFecha || null,
    },
  };
}
