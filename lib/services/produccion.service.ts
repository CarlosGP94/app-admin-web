// lib/services/prod-tubos.service.ts
import { Request, Transaction } from "mssql";
import type { ConnectionPool } from "mssql";
import * as ExcelJS from "exceljs";

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
  control_dimensional_id: number | null; // Nuevo campo para almacenar el ID del control dimensional asociado
}

interface ProdTuboRawResponse {
  id: number;
  control_dimensional_id: number | null;
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
    if (estructural === true) {
      whereClauses.push(
        `(t.tipo_id != 3 AND t.tipo_id != 4 AND t.espesor > 2)`,
      );
      request.input("estructural", estructural);
    }
    if (estructural === false) {
      // Paréntesis agregados para evitar romper los AND de las otras condiciones
      whereClauses.push(`(t.tipo_id = 3 OR t.tipo_id = 4 OR t.espesor <= 2)`);
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
          pt.control_dimensional_id,
          t.art_concepto AS tubo_concepto,
          lt.lote AS lote_codigo,
          tu.prefijo AS turno_prefijo,
          o.nombre + ' ' + ISNULL(o.apellido1, '') + ' ' + ISNULL(o.apellido2, '') AS operario_completo,
          pt.cant_tubos_buenos as tubos_buenos,
          pt.cant_tubos_malos as tubos_malos,
          pt.paquetes,
          CASE 
              WHEN (pt.cant_tubos_buenos - (pt.paquetes * t.num_por_paq)) < 0 THEN 0 
              ELSE (pt.cant_tubos_buenos - (pt.paquetes * t.num_por_paq)) 
          END AS paquete_incompleto,
          pt.creado,
          -- CONCATENACIÓN 100% COMPATIBLE CON SQL SERVER 2008
          STUFF((
              SELECT ',' + CAST(sub.maquina_id AS VARCHAR) + ':' + sub.maquina
              FROM (
                  SELECT tm.maquina_id, m.maquina, tm.tubo_id
                  FROM Tubos_Maquinas tm
                  INNER JOIN Maquinas m ON tm.maquina_id = m.id
                  GROUP BY tm.maquina_id, m.maquina, tm.tubo_id
              ) AS sub
              WHERE sub.tubo_id = pt.tubo_id
              FOR XML PATH('')
          ), 1, 1, '') AS maquinas_raw,
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

  // Mapeo y formateo final de los registros a la interfaz requerida
  const data: ProdTubo[] = result.recordset.map((row: ProdTuboRawResponse) => {
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
      tubos_buenos: row.tubos_buenos || 0,
      tubos_malos: row.tubos_malos || 0,
      paquetes: row.paquetes || 0,
      paquete_incompleto: row.paquete_incompleto || 0,
      action_id: row.id,
      control_dimensional_id: row.control_dimensional_id || null,
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

export interface ProduccionCreatePayload {
  tubo_id: number;
  maquina_id: number;
  fleje_id: number;
  unidades_objetivo: number;
  num_paquetes_objetivo?: number;
  observaciones?: string;
  // Campos de estado u orígenes si aplicasen
  estado_id?: number;
}

export interface ProduccionCreateResponse {
  id: number;
  codigo_orden: string;
  tubo_id: number;
  maquina_id: number;
  fecha_creacion: string;
}

/**
 * Servicio para crear una nueva Orden de Producción
 */
export async function crearProduccionService(
  pool: ConnectionPool,
  payload: ProduccionCreatePayload,
): Promise<ProduccionCreateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 1. Validar existencia del tubo y obtener su información base si es necesario
    const reqValidar = new Request(transaction);
    reqValidar.input("tubo_id", payload.tubo_id);

    const qValidarTubo = `
      SELECT id, art_concepto, activo 
      FROM Tubos 
      WHERE id = @tubo_id;
    `;
    const resValidar = await reqValidar.query(qValidarTubo);

    if (resValidar.recordset.length === 0) {
      throw new Error(`El tubo con ID ${payload.tubo_id} no existe.`);
    }

    if (!resValidar.recordset[0].activo) {
      throw new Error(`El tubo especificado no se encuentra activo.`);
    }

    // 2. Insertar la nueva orden de Producción
    const reqProduccion = new Request(transaction);
    reqProduccion.input("tubo_id", payload.tubo_id);
    reqProduccion.input("maquina_id", payload.maquina_id);
    reqProduccion.input("fleje_id", payload.fleje_id);
    reqProduccion.input("unidades_objetivo", payload.unidades_objetivo);
    reqProduccion.input(
      "num_paquetes_objetivo",
      payload.num_paquetes_objetivo ?? null,
    );
    reqProduccion.input("observaciones", payload.observaciones?.trim() ?? null);
    reqProduccion.input("estado_id", payload.estado_id ?? 1); // 1 = Pendiente/Iniciada por defecto

    const queryInsertProduccion = `
      INSERT INTO Produccion (
        tubo_id,
        maquina_id,
        fleje_id,
        unidades_objetivo,
        num_paquetes_objetivo,
        observaciones,
        estado_id,
        creado
      )
      OUTPUT 
        INSERTED.id,
        INSERTED.creado
      VALUES (
        @tubo_id,
        @maquina_id,
        @fleje_id,
        @unidades_objetivo,
        @num_paquetes_objetivo,
        @observaciones,
        @estado_id,
        GETDATE()
      );
    `;

    const resProduccion = await reqProduccion.query(queryInsertProduccion);
    const nuevaProduccion = resProduccion.recordset[0];
    const produccionId = nuevaProduccion.id;

    // 3. Generación opcional de un Código de Orden dinámico (ej: OP-2026-00012)
    const fechaActual = new Date(nuevaProduccion.creado);
    const year = fechaActual.getFullYear();
    const codigoOrden = `OP-${year}-${String(produccionId).padStart(5, "0")}`;

    // Si tu tabla guarda un codigo_orden único, actualizamos el registro
    const reqCodigo = new Request(transaction);
    reqCodigo.input("id", produccionId);
    reqCodigo.input("codigo_orden", codigoOrden);

    const qUpdateCodigo = `
      UPDATE Produccion 
      SET codigo_orden = @codigo_orden 
      WHERE id = @id;
    `;
    await reqCodigo.query(qUpdateCodigo);

    // 4. Confirmar transacción en la BD
    await transaction.commit();

    return {
      id: produccionId,
      codigo_orden: codigoOrden,
      tubo_id: payload.tubo_id,
      maquina_id: payload.maquina_id,
      fecha_creacion: fechaActual.toISOString(),
    };
  } catch (error) {
    // Revertir ante cualquier fallo
    await transaction.rollback();
    throw error;
  }
}

export interface ProduccionTuboDetalle {
  id: number;
  creado: string;
  operario_id: number;
  turno_id: number;
  maquina_id: number;
  tubo_id: number;
  lote_tubo_id: number;
  cant_tubos_buenos: number;
  cant_tubos_malos: number;
  paquetes: number;
  concentracion_taladrina: number | null;
  observacion: string | null;

  // Relaciones opcionales/anidadas para enriquecer la UI en caso de requerirse
  operario?: {
    id: number;
    nombre?: string;
    apellido1?: string | null;
    apellido2?: string | null;
  };
  turno?: {
    id: number;
    prefijo?: string | null;
    entrada?: string | null;
    salida?: string | null;
  };
  maquina?: {
    id: number;
    nombre?: string;
    [key: string]: unknown;
  };
  tubo?: {
    id: number;
    medida?: string;
    calidad_id?: number;
    espesor?: number;
    longitud?: number;
  };
  lote_tubo?: {
    id: number;
    codigo?: string;
    lote?: string;
  };
}

export async function obtenerProduccionTuboPorIdService(
  pool: ConnectionPool,
  id: number,
): Promise<ProduccionTuboDetalle | null> {
  const req = pool.request();
  req.input("id", id);

  const query = `
    SELECT 
      p.id,
      p.creado,
      p.operario_id,
      p.turno_id,
      p.maquina_id,
      p.tubo_id,
      p.lote_tubo_id,
      p.cant_tubos_buenos,
      p.cant_tubos_malos,
      p.paquetes,
      p.concentracion_taladrina,
      p.observacion,
      
      -- Datos del Operario
      o.nombre AS operario_nombre,
      o.apellido1 AS operario_apellido1,
      o.apellido2 AS operario_apellido2,

      -- Datos del Turno
      tr.prefijo AS turno_prefijo,
      tr.entrada AS turno_entrada,
      tr.salida AS turno_salida,

      -- Datos de la Máquina
      m.nombre AS maquina_nombre,

      -- Datos del Tubo
      t.medida AS tubo_medida,
      t.calidad_id AS tubo_calidad_id,

      -- Datos del Lote de Tubo
      l.lote AS lote_nombre

    FROM Prod_Tubos p
    LEFT JOIN Operarios o ON p.operario_id = o.id
    LEFT JOIN Turnos tr ON p.turno_id = tr.id
    LEFT JOIN Maquinas m ON p.maquina_id = m.id
    LEFT JOIN Tubos t ON p.tubo_id = t.id
    LEFT JOIN Lotes_Tubos l ON p.lote_tubo_id = l.id
    WHERE p.id = @id;
  `;

  const resultado = await req.query(query);
  const row = resultado.recordset[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
    operario_id: Number(row.operario_id),
    turno_id: Number(row.turno_id),
    maquina_id: Number(row.maquina_id),
    tubo_id: Number(row.tubo_id),
    lote_tubo_id: Number(row.lote_tubo_id),
    cant_tubos_buenos: Number(row.cant_tubos_buenos ?? 0),
    cant_tubos_malos: Number(row.cant_tubos_malos ?? 0),
    paquetes: Number(row.paquetes ?? 0),
    concentracion_taladrina:
      row.concentracion_taladrina !== null
        ? Number(row.concentracion_taladrina)
        : null,
    observacion: row.observacion ?? null,

    // Mapeo de objetos anidados/relaciones
    operario: row.operario_id
      ? {
          id: row.operario_id,
          nombre: row.operario_nombre,
          apellido1: row.operario_apellido1,
          apellido2: row.operario_apellido2,
        }
      : undefined,
    turno: row.turno_id
      ? {
          id: row.turno_id,
          prefijo: row.turno_prefijo,
          entrada: row.turno_entrada ? row.turno_entrada.toString() : null,
          salida: row.turno_salida ? row.turno_salida.toString() : null,
        }
      : undefined,
    maquina: row.maquina_id
      ? {
          id: row.maquina_id,
          nombre: row.maquina_nombre,
        }
      : undefined,
    tubo: row.tubo_id
      ? {
          id: row.tubo_id,
          medida: row.tubo_medida,
          calidad_id: row.tubo_calidad_id,
        }
      : undefined,
    lote_tubo: row.lote_tubo_id
      ? {
          id: row.lote_tubo_id,
          lote: row.lote_nombre,
        }
      : undefined,
  };
}

export interface ProduccionTuboUpdatePayload {
  id: number;
  tubo_id: number;
  maquina_id?: number;
  lote_id?: number;
  turno_id?: number;
  fleje_id?: number;
  operario_id?: number;
  cant_tubos_buenos: number;
  cant_tubos_malos?: number;
  velocidad?: number;
  observaciones?: string;
  creado?: string;
  // Añadir aquí cualquier otro campo que pertenezca a la tabla de producción
}

export interface ProduccionTuboUpdateResponse {
  id: number;
  tubo_id: number;
  cant_tubos_buenos: number;
  mensaje: string;
}

/**
 * Función auxiliar para recalcular y actualizar stock de un Tubo específico en DB
 */
async function actualizarStockTubo(
  transaction: Transaction,
  tuboId: number,
  deltaUnidades: number,
): Promise<void> {
  // 1. Obtener datos actuales del tubo
  const reqGetTubo = new Request(transaction);
  reqGetTubo.input("tubo_id", tuboId);

  const resTubo = await reqGetTubo.query(`
    SELECT unidades, num_por_paq, peso_unitario 
    FROM Tubos 
    WHERE id = @tubo_id;
  `);

  if (resTubo.recordset.length === 0) {
    throw new Error(`El tubo con ID ${tuboId} no existe en la base de datos.`);
  }

  const {
    unidades: unidadesActuales,
    num_por_paq,
    peso_unitario,
  } = resTubo.recordset[0];

  // 2. Nuevos valores calculados
  const nuevasUnidades = Math.max(0, (unidadesActuales || 0) + deltaUnidades);

  const cantPorPaq = Number(num_por_paq) || 0;
  const numPaquetes =
    cantPorPaq > 0 ? Math.round((nuevasUnidades / cantPorPaq) * 10) / 10 : 0;

  const pesoUnit = Number(peso_unitario) || 0;
  const nuevoPesoTotal = nuevasUnidades * pesoUnit;

  // 3. Actualizar la tabla Tubos
  const reqUpdateTubo = new Request(transaction);
  reqUpdateTubo.input("tubo_id", tuboId);
  reqUpdateTubo.input("unidades", nuevasUnidades);
  reqUpdateTubo.input("num_paquetes", numPaquetes);
  reqUpdateTubo.input("peso_total", nuevoPesoTotal);

  await reqUpdateTubo.query(`
    UPDATE Tubos
    SET 
      unidades = @unidades,
      num_paquetes = @num_paquetes,
      peso_total = @peso_total
    WHERE id = @tubo_id;
  `);
}

/**
 * Función auxiliar para buscar o crear un lote en Lotes_Tubos
 */
async function obtenerOCrearLoteId(
  transaction: Transaction,
  fecha: string | Date,
  maquinaId: number,
  turnoId: number,
): Promise<number> {
  const reqLote = new Request(transaction);
  reqLote.input("fecha", fecha);
  reqLote.input("maquina_id", maquinaId);
  reqLote.input("turno_id", turnoId);

  // 1. Buscar lote existente por día, mes, año, máquina y turno
  const resLote = await reqLote.query(`
    SELECT id 
    FROM Lotes_Tubos 
    WHERE CAST(creado AS DATE) = CAST(@fecha AS DATE)
      AND maquina_id = @maquina_id
      AND turno_id = @turno_id;
  `);

  if (resLote.recordset.length > 0) {
    return resLote.recordset[0].id;
  }

  // 2. Si no existe, obtener el prefijo del turno para armar el string del lote
  const reqTurno = new Request(transaction);
  reqTurno.input("turno_id", turnoId);

  const resTurno = await reqTurno.query(`
    SELECT prefijo 
    FROM Turnos 
    WHERE id = @turno_id;
  `);

  if (resTurno.recordset.length === 0) {
    throw new Error(`No se encontró el turno con ID ${turnoId}`);
  }

  const prefijoTurno = resTurno.recordset[0].prefijo ?? "";

  const fechaDate = typeof fecha === "string" ? new Date(fecha) : fecha;

  // Formatting DDMMAA (ejemplo: 20/06/2026 -> 200626)
  const dia = String(fechaDate.getDate()).padStart(2, "0");
  const mes = String(fechaDate.getMonth() + 1).padStart(2, "0");
  const anio = String(fechaDate.getFullYear()).slice(-2);
  const fechaFormateada = `${dia}${mes}${anio}`;

  // Formato final: LT + maquina_id + DDMMAA + prefijo
  const codigoLote = `LT${maquinaId}${fechaFormateada}${prefijoTurno}`;

  // 3. Insertar el nuevo lote
  const reqInsertLote = new Request(transaction);
  reqInsertLote.input("lote", codigoLote);
  reqInsertLote.input("creado", fechaDate);
  reqInsertLote.input("maquina_id", maquinaId);
  reqInsertLote.input("turno_id", turnoId);

  const resInsert = await reqInsertLote.query(`
    INSERT INTO Lotes_Tubos (lote, creado, maquina_id, turno_id)
    OUTPUT INSERTED.id
    VALUES (@lote, @creado, @maquina_id, @turno_id);
  `);

  return resInsert.recordset[0].id;
}

export async function actualizarProduccionTuboService(
  pool: ConnectionPool,
  payload: ProduccionTuboUpdatePayload,
): Promise<ProduccionTuboUpdateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 1. Consultar el registro de producción previo
    const reqPrevio = new Request(transaction);
    reqPrevio.input("id", payload.id);

    const resPrevio = await reqPrevio.query(`
      SELECT 
        tubo_id, 
        cant_tubos_buenos, 
        control_dimensional_id,
        turno_id,
        maquina_id,
        creado,
        lote_tubo_id
      FROM Prod_Tubos 
      WHERE id = @id;
    `);

    if (resPrevio.recordset.length === 0) {
      throw new Error(
        `No se encontró el registro de producción con ID ${payload.id}`,
      );
    }

    const {
      tubo_id: tuboIdViejo,
      cant_tubos_buenos: tubosBuenosViejos,
      control_dimensional_id: controlDimensionalId,
      turno_id: turnoIdViejo,
      maquina_id: maquinaIdViejo,
      creado: fechaVieja,
      lote_tubo_id: loteIdViejo,
    } = resPrevio.recordset[0];

    const tuboIdNuevo = payload.tubo_id;
    const tubosBuenosNuevos = payload.cant_tubos_buenos || 0;
    const fechaNueva = payload.creado ?? new Date();
    const turnoIdNuevo = payload.turno_id ?? turnoIdViejo;
    const maquinaIdNuevo = payload.maquina_id ?? maquinaIdViejo;

    // 2. Determinar el lote_id (Recalcular si cambiaron fecha, turno o máquina)
    let loteIdFinal = payload.lote_id ?? loteIdViejo;

    const fechaCambio =
      new Date(fechaVieja).getTime() !== new Date(fechaNueva).getTime();
    const turnoCambio = turnoIdViejo !== turnoIdNuevo;
    const maquinaCambio = maquinaIdViejo !== maquinaIdNuevo;

    if (fechaCambio || turnoCambio || maquinaCambio || !loteIdFinal) {
      if (maquinaIdNuevo && turnoIdNuevo) {
        loteIdFinal = await obtenerOCrearLoteId(
          transaction,
          fechaNueva,
          maquinaIdNuevo,
          turnoIdNuevo,
        );
      }
    }

    // 3. Actualizar el stock del/los tubo(s)
    if (tuboIdViejo === tuboIdNuevo) {
      const diferencia = tubosBuenosNuevos - (tubosBuenosViejos || 0);
      if (diferencia !== 0) {
        await actualizarStockTubo(transaction, tuboIdNuevo, diferencia);
      }
    } else {
      if (tubosBuenosViejos && tubosBuenosViejos > 0) {
        await actualizarStockTubo(transaction, tuboIdViejo, -tubosBuenosViejos);
      }
      if (tubosBuenosNuevos > 0) {
        await actualizarStockTubo(transaction, tuboIdNuevo, tubosBuenosNuevos);
      }
    }

    // 4. Actualizar la tabla Prod_Tubos
    const reqUpdateProd = new Request(transaction);
    reqUpdateProd.input("id", payload.id);
    reqUpdateProd.input("turno_id", turnoIdNuevo ?? null);
    reqUpdateProd.input("tubo_id", payload.tubo_id);
    reqUpdateProd.input("maquina_id", maquinaIdNuevo ?? null);
    reqUpdateProd.input("lote_id", loteIdFinal ?? null);
    reqUpdateProd.input("operario_id", payload.operario_id ?? null);
    reqUpdateProd.input("cant_tubos_buenos", tubosBuenosNuevos);
    reqUpdateProd.input("cant_tubos_malos", payload.cant_tubos_malos ?? 0);
    reqUpdateProd.input("observaciones", payload.observaciones ?? "");
    reqUpdateProd.input("creado", fechaNueva);

    const queryUpdateProd = `
      UPDATE Prod_Tubos
      SET 
        turno_id = @turno_id,
        tubo_id = @tubo_id,
        maquina_id = @maquina_id,
        lote_tubo_id = @lote_id,
        operario_id = @operario_id,
        cant_tubos_buenos = @cant_tubos_buenos,
        cant_tubos_malos = @cant_tubos_malos,
        observacion = @observaciones,
        creado = @creado
      WHERE id = @id;
    `;

    await reqUpdateProd.query(queryUpdateProd);

    // 5. Actualizar el registro de Control_Dimensional si existe
    if (controlDimensionalId) {
      const reqUpdateControl = new Request(transaction);
      reqUpdateControl.input("control_id", controlDimensionalId);
      reqUpdateControl.input("tubo_id", payload.tubo_id);
      reqUpdateControl.input("operario_id", payload.operario_id ?? null);
      reqUpdateControl.input("maquina_id", maquinaIdNuevo ?? null);
      reqUpdateControl.input("creado", fechaNueva);

      const queryUpdateControl = `
        UPDATE Control_Dimensional
        SET 
          tubo_id = @tubo_id,
          maquina_id = @maquina_id,
          creado = @creado
        WHERE id = @control_id;
      `;

      await reqUpdateControl.query(queryUpdateControl);
    }

    // 6. Confirmar cambios
    await transaction.commit();

    return {
      id: payload.id,
      tubo_id: payload.tubo_id,
      cant_tubos_buenos: tubosBuenosNuevos,
      mensaje:
        "Producción, stock, lote y control dimensional actualizados correctamente.",
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export interface EliminarProduccionTuboResponse {
  id: number;
  mensaje: string;
}

/**
 * Servicio para eliminar un registro de producción de tubo.
 * Resta la producción devuelta al stock del tubo y elimina
 * el control dimensional asociado si existe.
 */
export async function eliminarProduccionTuboService(
  pool: ConnectionPool,
  id: number,
): Promise<EliminarProduccionTuboResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 1. Obtener la producción existente para verificar que existe y capturar sus datos clave
    const reqObtener = new Request(transaction);
    reqObtener.input("id", id);

    const resObtener = await reqObtener.query(`
      SELECT tubo_id, cant_tubos_buenos, control_dimensional_id 
      FROM Prod_Tubos 
      WHERE id = @id;
    `);

    if (resObtener.recordset.length === 0) {
      throw new Error(`No se encontró la producción con ID ${id}.`);
    }

    const {
      tubo_id: tuboId,
      cant_tubos_buenos: tubosBuenos,
      control_dimensional_id: controlDimensionalId,
    } = resObtener.recordset[0];

    // 2. Revertir/Restar del stock del tubo las unidades de esta producción
    if (tuboId && tubosBuenos && tubosBuenos > 0) {
      // Al pasar el valor negativo (-tubosBuenos), la función auxiliar restar del acumulado en DB
      await actualizarStockTubo(transaction, tuboId, -tubosBuenos);
    }

    // 3. Eliminar el registro principal de la producción en Prod_Tubos
    const reqDeleteProd = new Request(transaction);
    reqDeleteProd.input("id", id);
    await reqDeleteProd.query(`
      DELETE FROM Prod_Tubos 
      WHERE id = @id;
    `);

    // 4. Si existe un control dimensional vinculado, eliminarlo
    if (controlDimensionalId) {
      const reqDeleteControl = new Request(transaction);
      reqDeleteControl.input("controlDimensionalId", controlDimensionalId);
      await reqDeleteControl.query(`
        DELETE FROM Control_Dimensional
        WHERE id = @controlDimensionalId;
      `);
    }

    // 5. Confirmar las operaciones en base de datos
    await transaction.commit();

    return {
      id,
      mensaje: `Producción con ID ${id} eliminada correctamente, stock actualizado y control dimensional eliminado.`,
    };
  } catch (error) {
    // Si falla cualquier paso, revertir todos los cambios realizados
    await transaction.rollback();
    throw error;
  }
}

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

export interface ProdLoteTuboConFlejes {
  id: number; // ID de Lotes_Tubos
  prod_tubo_id: number; // ID de Prod_Tubos
  tubo_id: number;
  tubo: string;
  lote: string;
  maquina: string;
  fecha: string;
  flejes: FlejeDetalle[];
}

export interface ListarProdLotesParams {
  page?: number;
  pageSize?: number;
  orderBy?: "id" | "lote" | "creado" | "maquina";
  orderDir?: "ASC" | "DESC";
  filtros?: {
    tubo_id?: number;
    lote?: string;
    maquina_id?: number;
    fechaInicio?: string; // ISO 8601
    fechaFin?: string; // ISO 8601
  };
}

/**
 * Servicio para obtener la producción de tubos con su Lote_Tubo
 * y sus Lotes_Flejes asociados cruzando por tubo_id y lote_tubo_id.
 */
export async function obtenerProdLotesTubosConFlejesService(
  pool: ConnectionPool,
  prodTuboIds: number[],
): Promise<ProdLoteTuboConFlejes[]> {
  if (!prodTuboIds || prodTuboIds.length === 0) {
    return [];
  }

  const req = pool.request();

  // Construcción de parámetros dinámicos (@id0, @id1, ...)
  const idParams = prodTuboIds.map((id, index) => {
    const paramName = `id${index}`;
    req.input(paramName, id);
    return `@${paramName}`;
  });

  const query = `
    SELECT
      -- Datos de la Producción de Tubo
      pt.id AS prod_tubo_id,
      pt.tubo_id AS prod_tubo_tubo_id,

      -- Tubos
      t.medida AS tubo_medida,

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

    FROM Prod_Tubos pt
    LEFT JOIN Lotes_Tubos lt ON pt.lote_tubo_id = lt.id
    LEFT JOIN Maquinas m ON lt.maquina_id = m.id

    -- CRUCE SOLICITADO: lft.tubo_id = pt.tubo_id AND lft.lote_tubo_id = pt.lote_tubo_id
    LEFT JOIN Tubos t ON pt.tubo_id = t.id

    LEFT JOIN lotes_flejes_Tubos lft 
      ON lft.tubo_id = pt.tubo_id 
     AND lft.lote_tubo_id = pt.lote_tubo_id
    
    LEFT JOIN Lotes_Flejes lf ON lft.lote_fleje_id = lf.id
    
    -- Relaciones para obtener Bobina y Colada Real
    LEFT JOIN Bobinas_Cortadas bc ON lf.bobina_cortada_id = bc.id
    LEFT JOIN Bobinas b_real ON bc.bobina_id = b_real.id
    LEFT JOIN Bobina_Coladas col_real ON lf.colada_id = col_real.id

    -- Relaciones para obtener Auditoría (si existe)
    LEFT JOIN Auditoria_Bobinas ab ON lf.auditoria_id = ab.id
    LEFT JOIN Bobinas_Cortadas b_aud ON ab.bobina_id = b_aud.id
    LEFT JOIN Bobina_Coladas b_col_aud ON ab.colada_id = b_col_aud.id

    WHERE pt.id IN (${idParams.join(", ")})
    ORDER BY lt.creado DESC, lf.id DESC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  // Agrupación de filas por Prod_Tubos / Lote_Tubo
  const lotesMap = new Map<number, ProdLoteTuboConFlejes>();

  for (const row of rows) {
    const key = row.prod_tubo_id;

    if (!lotesMap.has(key)) {
      lotesMap.set(key, {
        id: row.lote_tubo_id ?? 0,
        prod_tubo_id: row.prod_tubo_id,
        tubo_id: row.prod_tubo_tubo_id,
        tubo: row.tubo_medida ?? "",
        lote: row.lote_tubo_nombre ?? "",
        maquina: row.maquina_nombre ?? "",
        fecha: row.lote_tubo_fecha
          ? new Date(row.lote_tubo_fecha).toISOString()
          : "",
        flejes: [],
      });
    }

    const loteActual = lotesMap.get(key)!;

    // Agregar el fleje si existiera la relación
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

export interface GenerarExcelProdTubosParams {
  fechaInicio?: string; // Formato ISO o YYYY-MM-DD
  fechaFin?: string; // Formato ISO o YYYY-MM-DD
}

/**
 * Genera el reporte de producción en Excel para tubos estructurales
 * filtrando por un rango opcional de fechas (pt.creado).
 * Valida la consistencia de coladas por lote_tubo_id y tubo_id.
 */
export async function generarExcelProdTubosService(
  pool: ConnectionPool,
  params: GenerarExcelProdTubosParams = {},
): Promise<Buffer> {
  const { fechaInicio, fechaFin } = params;
  const req = pool.request();

  // 1. Cláusula fija para tubos estructurales
  const whereClauses: string[] = [
    "t.tipo_id != 3",
    "t.tipo_id != 4",
    "t.espesor > 2",
  ];

  // 2. Manejo dinámico del rango de fechas sobre pt.creado
  if (fechaInicio && fechaFin) {
    whereClauses.push("pt.creado >= @fechaInicio AND pt.creado <= @fechaFin");
    req.input("fechaInicio", fechaInicio);
    req.input("fechaFin", fechaFin);
  } else if (fechaInicio) {
    // Desde fechaInicio hasta el momento actual
    whereClauses.push("pt.creado >= @fechaInicio");
    req.input("fechaInicio", fechaInicio);
  } else if (fechaFin) {
    // Hasta fechaFin
    whereClauses.push("pt.creado <= @fechaFin");
    req.input("fechaFin", fechaFin);
  }
  // Si no recibe ni fechaInicio ni fechaFin, trae el histórico completo

  const whereSQL =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // 3. Consulta SQL con filtro estructural + fechas, ordenado por pt.creado DESC
  const query = `
    SELECT 
      pt.id AS prod_tubo_id,
      pt.lote_tubo_id,
      pt.tubo_id,
      pt.paquetes,
      pt.creado AS pt_creado,
      lt.lote,
      t.medida,
      t.peso_unitario * pt.cant_tubos_buenos AS peso_total,
      lf.id AS fleje_id,
      lf.lote AS fleje_lote,
      bc.id AS colada_id,
      bc.colada,
      o.apellido1 AS operario_apellido1,
      o.apellido2 AS operario_apellido2,
      o.nombre AS operario_nombre,
      f.nombre AS fabricante_nombre,
      t.longitud,
      t.espesor,
      m.maquina,
      tr.prefijo AS turno_prefijo,
      tr.entrada AS turno_entrada,
      tr.salida AS turno_salida,
      lft.num_paq_inicial,
      lft.num_paq_final
    FROM Prod_Tubos pt
    LEFT JOIN Maquinas m ON m.id = pt.maquina_id
    LEFT JOIN Turnos tr ON tr.id = pt.turno_id
    LEFT JOIN Operarios o ON o.id = pt.operario_id
    LEFT JOIN Lotes_Tubos lt ON lt.id = pt.lote_tubo_id
    LEFT JOIN Tubos t ON t.id = pt.tubo_id
    LEFT JOIN Lotes_Flejes_Tubos lft ON lft.tubo_id = pt.tubo_id AND lft.lote_tubo_id = pt.lote_tubo_id
    LEFT JOIN Lotes_Flejes lf ON lf.id = lft.lote_fleje_id
    LEFT JOIN Auditoria_Bobinas ab ON ab.id = lf.auditoria_id
    LEFT JOIN Bobina_Coladas bc ON bc.id = ab.colada_id
    LEFT JOIN Bobinas b ON b.id = ab.bobina_id
    LEFT JOIN Fabricantes f ON f.id = b.fabricante_id
    ${whereSQL}
    ORDER BY pt.creado DESC, lf.id DESC;
  `;

  const resultado = await req.query(query);

  const rows = resultado.recordset;

  // Si no hay datos devueltos para el filtro
  if (!rows || rows.length === 0) {
    throw new Error(
      "No se encontraron registros de producción para los filtros especificados.",
    );
  }

  // ==========================================
  // 4. VALIDACIÓN DE INCONSISTENCIA DE COLADAS
  // ==========================================
  const grupoValidacion = new Map<
    string,
    { flejes: Set<number>; coladas: Set<number>; loteName: string }
  >();

  for (const row of rows) {
    if (!row.lote_tubo_id || !row.tubo_id) continue;

    const key = `${row.lote_tubo_id}_${row.tubo_id}`;

    if (!grupoValidacion.has(key)) {
      grupoValidacion.set(key, {
        flejes: new Set(),
        coladas: new Set(),
        loteName: row.lote ?? `ID ${row.lote_tubo_id}`,
      });
    }

    const item = grupoValidacion.get(key)!;

    if (row.fleje_id) item.flejes.add(row.fleje_id);
    if (row.colada_id) item.coladas.add(row.colada_id);
  }

  // Si hay >= 2 flejes distintos Y >= 2 coladas distintas para la misma combinación (lote_tubo_id, tubo_id)
  for (const [, data] of grupoValidacion.entries()) {
    if (data.flejes.size >= 2 && data.coladas.size >= 2) {
      throw new Error(
        `Error de trazabilidad: El Lote de Tubo "${data.loteName}" posee múltiples flejes pertenecientes a coladas distintas. Proceso cancelado.`,
      );
    }
  }

  // ==========================================
  // 5. GENERACIÓN DE DOCUMENTO EXCEL (ExcelJS)
  // ==========================================
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Producción Tubos");

  worksheet.columns = [
    {
      header: "Fecha",
      key: "creado",
      width: 22,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Lote",
      key: "lote",
      width: 18,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Medida",
      key: "medida",
      width: 20,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Longitud (mm)",
      key: "longitud",
      width: 20,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Espesor (mm)",
      key: "espesor",
      width: 20,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Producción - Paquetes",
      key: "paquetes",
      width: 25,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Producción - Peso Total (kg)",
      key: "peso_total",
      width: 30,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Operario",
      key: "operario",
      width: 25,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Máquina",
      key: "maquina",
      width: 15,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Turno",
      key: "turno_prefijo",
      width: 22,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Fleje Lote",
      key: "fleje_lote",
      width: 15,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Paquete Inicio",
      key: "num_paq_inicial",
      width: 15,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Paquete Fin",
      key: "num_paq_final",
      width: 15,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Colada",
      key: "colada",
      width: 15,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
    {
      header: "Fabricante",
      key: "fabricante_nombre",
      width: 20,
      style: { alignment: { horizontal: "center", vertical: "middle" } },
    },
  ];

  // Mantenemos la cabecera en negrita
  worksheet.getRow(1).font = { bold: true };

  worksheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    worksheet.addRow({
      creado: row.pt_creado
        ? (() => {
            const fecha = new Date(row.pt_creado);
            const dia = String(fecha.getDate()).padStart(2, "0");
            const mes = String(fecha.getMonth() + 1).padStart(2, "0");
            const anio = String(fecha.getFullYear()).slice(-2);
            return `${dia}-${mes}-${anio}`;
          })()
        : "",
      lote: row.lote ?? "-",
      medida: row.medida ?? "-",
      longitud: row.longitud ?? 0,
      espesor: row.espesor ?? 0,
      paquetes: row.paquetes ?? 0,
      peso_total: row.peso_total ?? 0,
      operario:
        `${row.operario_apellido1 ?? "-"} ${row.operario_apellido2 ?? ""} ${row.operario_nombre ?? ""}`.trim() ||
        "",
      maquina: row.maquina ?? "-",
      turno_prefijo: row.turno_prefijo
        ? `${row.turno_prefijo} (${row.turno_entrada ?? ""} - ${row.turno_salida ?? ""})`
        : "-",
      fleje_lote: row.fleje_lote ?? "-",
      num_paq_inicial: row.num_paq_inicial ?? 0,
      num_paq_final: row.num_paq_final ?? 0,
      colada: row.colada ?? "-",
      fabricante_nombre: row.fabricante_nombre ?? "-",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
