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
    console.log("Filtros recibidos:", estructural);
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
    if (estructural === true) {
      whereClauses.push(`t.tipo_id != 3 AND t.tipo_id != 4 AND t.espesor > 2`);
      request.input("estructural", estructural);
    }
    if (estructural === false) {
      whereClauses.push(`t.tipo_id = 3 OR t.tipo_id = 4 OR t.espesor <= 2`);
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
      request.input("fechaInicio", `${fechaInicio} 00:00:00.000`);
    }
    if (fechaFin) {
      whereClauses.push(`pt.creado < @fechaFin`);
      request.input("fechaFin", `${fechaFin} 23:59:59.999`);
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
    tubos_buenos: "pt.cant_tubos_buenos",
    tubos_malos: "pt.cant_tubos_malos",
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
            CASE 
                WHEN (pt.cant_tubos_buenos - (pt.paquetes * t.num_por_paq)) < 0 THEN 0 
                ELSE (pt.cant_tubos_buenos - (pt.paquetes * t.num_por_paq)) 
            END AS paquete_incompleto,
            pt.creado,
            (
               SELECT STRING_AGG(CAST(sub.maquina_id AS VARCHAR) + ':' + sub.maquina, ',')
               FROM (
                   -- GROUP BY evita duplicados si hay registros repetidos en Tubos_Maquinas
                   SELECT tm.maquina_id, m.maquina, tm.tubo_id
                   FROM Tubos_Maquinas tm
                   INNER JOIN Maquinas m ON tm.maquina_id = m.id
                   GROUP BY tm.maquina_id, m.maquina, tm.tubo_id
               ) AS sub
               WHERE sub.tubo_id = pt.tubo_id
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

  console.log("Query SQL generado:", query);

  request.input("rowStart", rowStart);
  request.input("rowEnd", rowEnd);

  const result = await request.query(query);

  // Mapeo y formateo final de los registros a la interfaz requerida
  const data: ProdTubo[] = result.recordset.map((row: ProdTuboRawResponse) => {
    // Parseo seguro del string de máquinas agrupadas "1:Cortadora,2:Prensa"
    const maquinas: MaquinaItem[] = row.maquinas_raw
      ? row.maquinas_raw.split(",").map((item: string) => {
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
      tubos_buenos: row.tubos_buenos || 0, // Corregido: antes apuntaba a campos inexistentes en row
      tubos_malos: row.tubos_malos || 0, // Corregido: antes apuntaba a campos inexistentes en row
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
  operarioId?: number;
  espesor?: number;
  estructural?: "SI" | "NO";
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
  operarios: { id: number; nombre: string }[];
  espesores: number[];
  estructural: { si: boolean; no: boolean };
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
  const operarioId = filtros?.operarioId;
  const espesor = filtros?.espesor;
  const estructural = filtros?.estructural; // <-- Puede ser 'SI', 'NO' o undefined
  const fechaInicio = filtros?.fechaInicio;
  const fechaFin = filtros?.fechaFin;

  // Modificación de fecha límite superior para capturar el día completo con sus horas
  let fechaFinLimite: string | null = null;
  if (fechaFin) {
    const proxDia = new Date(fechaFin);
    proxDia.setDate(proxDia.getDate() + 1);
    fechaFinLimite = `${proxDia.toISOString().split("T")[0]} 00:00:00.000`;
  }
  const fInicioParam = fechaInicio ? `${fechaInicio} 00:00:00.000` : null;

  // Helper para aplicar la lógica condicional de "estructural" en los WHERE
  const getEstructuralSqlCondition = (valor: string | undefined): string => {
    if (!valor) return "";
    return valor.toUpperCase() === "SI"
      ? " AND (t.tipo_id <> 3 AND t.tipo_id <> 4 AND t.espesor > 2)"
      : " AND (t.tipo_id = 3 OR t.tipo_id = 4 OR t.espesor <= 2)";
  };

  const sqlEstructuralCond = getEstructuralSqlCondition(estructural);

  const reqCalidades = pool.request();
  const reqTurnos = pool.request();
  const reqMaquinas = pool.request();
  const reqOperarios = pool.request();
  const reqEspesores = pool.request();
  const reqEstructural = pool.request(); // <-- Nuevo request
  const reqFechas = pool.request();

  // --- QUERY 1: CALIDADES ---
  let whereCalidades = "WHERE 1=1" + sqlEstructuralCond;
  if (turnoId) {
    whereCalidades += " AND pt.turno_id = @turnoId";
    reqCalidades.input("turnoId", turnoId);
  }
  if (operarioId) {
    whereCalidades += " AND pt.operario_id = @operarioId";
    reqCalidades.input("operarioId", operarioId);
  }
  if (espesor) {
    whereCalidades += " AND t.espesor = @espesor";
    reqCalidades.input("espesor", espesor);
  }
  if (maquinaId) {
    whereCalidades +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqCalidades.input("maquinaId", maquinaId);
  }
  if (fInicioParam) {
    whereCalidades += " AND pt.creado >= @fechaInicio";
    reqCalidades.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereCalidades += " AND pt.creado < @fechaFinLimite";
    reqCalidades.input("fechaFinLimite", fechaFinLimite);
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
  let whereTurnos = "WHERE 1=1" + sqlEstructuralCond;
  if (calidadId) {
    whereTurnos += " AND t.calidad_id = @calidadId";
    reqTurnos.input("calidadId", calidadId);
  }
  if (operarioId) {
    whereTurnos += " AND pt.operario_id = @operarioId";
    reqTurnos.input("operarioId", operarioId);
  }
  if (espesor) {
    whereTurnos += " AND t.espesor = @espesor";
    reqTurnos.input("espesor", espesor);
  }
  if (maquinaId) {
    whereTurnos +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqTurnos.input("maquinaId", maquinaId);
  }
  if (fInicioParam) {
    whereTurnos += " AND pt.creado >= @fechaInicio";
    reqTurnos.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereTurnos += " AND pt.creado < @fechaFinLimite";
    reqTurnos.input("fechaFinLimite", fechaFinLimite);
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
  let whereMaquinas = "WHERE 1=1" + sqlEstructuralCond;
  if (calidadId) {
    whereMaquinas += " AND t.calidad_id = @calidadId";
    reqMaquinas.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereMaquinas += " AND pt.turno_id = @turnoId";
    reqMaquinas.input("turnoId", turnoId);
  }
  if (operarioId) {
    whereMaquinas += " AND pt.operario_id = @operarioId";
    reqMaquinas.input("operarioId", operarioId);
  }
  if (espesor) {
    whereMaquinas += " AND t.espesor = @espesor";
    reqMaquinas.input("espesor", espesor);
  }
  if (fInicioParam) {
    whereMaquinas += " AND pt.creado >= @fechaInicio";
    reqMaquinas.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereMaquinas += " AND pt.creado < @fechaFinLimite";
    reqMaquinas.input("fechaFinLimite", fechaFinLimite);
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

  // --- QUERY 4: OPERARIOS ---
  let whereOperarios = "WHERE 1=1" + sqlEstructuralCond;
  if (calidadId) {
    whereOperarios += " AND t.calidad_id = @calidadId";
    reqOperarios.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereOperarios += " AND pt.turno_id = @turnoId";
    reqOperarios.input("turnoId", turnoId);
  }
  if (espesor) {
    whereOperarios += " AND t.espesor = @espesor";
    reqOperarios.input("espesor", espesor);
  }
  if (maquinaId) {
    whereOperarios +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqOperarios.input("maquinaId", maquinaId);
  }
  if (fInicioParam) {
    whereOperarios += " AND pt.creado >= @fechaInicio";
    reqOperarios.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereOperarios += " AND pt.creado < @fechaFinLimite";
    reqOperarios.input("fechaFinLimite", fechaFinLimite);
  }
  const qOperarios = `
    SELECT DISTINCT o.id, o.nombre + ' ' + o.apellido1 + ' ' + o.apellido2 AS nombre_completo
    FROM Prod_Tubos pt
    INNER JOIN Operarios o ON pt.operario_id = o.id
    LEFT JOIN Tubos t ON pt.tubo_id = t.id
    ${whereOperarios}
    ORDER BY nombre_completo ASC;
  `;

  // --- QUERY 5: ESPESORES ---
  let whereEspesores = "WHERE 1=1" + sqlEstructuralCond;
  if (calidadId) {
    whereEspesores += " AND t.calidad_id = @calidadId";
    reqEspesores.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereEspesores += " AND pt.turno_id = @turnoId";
    reqEspesores.input("turnoId", turnoId);
  }
  if (operarioId) {
    whereEspesores += " AND pt.operario_id = @operarioId";
    reqEspesores.input("operarioId", operarioId);
  }
  if (maquinaId) {
    whereEspesores +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqEspesores.input("maquinaId", maquinaId);
  }
  if (fInicioParam) {
    whereEspesores += " AND pt.creado >= @fechaInicio";
    reqEspesores.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereEspesores += " AND pt.creado < @fechaFinLimite";
    reqEspesores.input("fechaFinLimite", fechaFinLimite);
  }
  const qEspesores = `
    SELECT DISTINCT t.espesor
    FROM Prod_Tubos pt
    INNER JOIN Tubos t ON pt.tubo_id = t.id
    ${whereEspesores}
    ORDER BY t.espesor ASC;
  `;

  // --- QUERY 6: ESTRUCTURAL (Nueva) ---
  let whereEstructural = "WHERE 1=1";
  if (calidadId) {
    whereEstructural += " AND t.calidad_id = @calidadId";
    reqEstructural.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereEstructural += " AND pt.turno_id = @turnoId";
    reqEstructural.input("turnoId", turnoId);
  }
  if (operarioId) {
    whereEstructural += " AND pt.operario_id = @operarioId";
    reqEstructural.input("operarioId", operarioId);
  }
  if (espesor) {
    whereEstructural += " AND t.espesor = @espesor";
    reqEstructural.input("espesor", espesor);
  }
  if (maquinaId) {
    whereEstructural +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
    reqEstructural.input("maquinaId", maquinaId);
  }
  if (fInicioParam) {
    whereEstructural += " AND pt.creado >= @fechaInicio";
    reqEstructural.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereEstructural += " AND pt.creado < @fechaFinLimite";
    reqEstructural.input("fechaFinLimite", fechaFinLimite);
  }
  const qEstructural = `
    SELECT DISTINCT 
      CASE 
        WHEN t.tipo_id <> 3 AND t.tipo_id <> 4 AND t.espesor > 2 THEN 'SI'
        ELSE 'NO'
      END AS es_estructural
    FROM Prod_Tubos pt
    INNER JOIN Tubos t ON pt.tubo_id = t.id
    ${whereEstructural};
  `;

  // --- QUERY 7: RANGO DE FECHAS ---
  let whereFechas = "WHERE 1=1" + sqlEstructuralCond;
  if (calidadId) {
    whereFechas += " AND t.calidad_id = @calidadId";
    reqFechas.input("calidadId", calidadId);
  }
  if (turnoId) {
    whereFechas += " AND pt.turno_id = @turnoId";
    reqFechas.input("turnoId", turnoId);
  }
  if (operarioId) {
    whereFechas += " AND pt.operario_id = @operarioId";
    reqFechas.input("operarioId", operarioId);
  }
  if (espesor) {
    whereFechas += " AND t.espesor = @espesor";
    reqFechas.input("espesor", espesor);
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

  // Ejecución paralela de las 7 consultas
  const [
    resCalidades,
    resTurnos,
    resMaquinas,
    resOperarios,
    resEspesores,
    resEstructural,
    resFechas,
  ] = await Promise.all([
    reqCalidades.query(qCalidades),
    reqTurnos.query(qTurnos),
    reqMaquinas.query(qMaquinas),
    reqOperarios.query(qOperarios),
    reqEspesores.query(qEspesores),
    reqEstructural.query(qEstructural), // <-- Añadido
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
    operarios: resOperarios.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre_completo,
    })),
    espesores: resEspesores.recordset.map((row) => row.espesor),
    estructural: {
      si: resEstructural.recordset.some((row) => row.es_estructural === "SI"),
      no: resEstructural.recordset.some((row) => row.es_estructural === "NO"),
    },
    rangoFechas: {
      minFecha: resFechas.recordset[0]?.minFecha || null,
      maxFecha: resFechas.recordset[0]?.maxFecha || null,
    },
  };
}
