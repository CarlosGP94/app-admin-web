import { ConnectionPool } from "mssql";
import { PAGE_SIZE } from "@/config/constants";

// Interfaces adaptadas al listado de salidas
export interface FiltrosSalidasPaqs {
  busqueda?: string;
  operario?: number;
  calidad?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarSalidasPaqsParams {
  filtros?: FiltrosSalidasPaqs;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

export interface SalidaPaqueteTubo {
  id: number;
  tubo: string;
  num_paqs: number;
  resto: number;
  operario: string;
  action_id: number;
  fecha: Date | string;
}

interface SalidaPaqueteRawResponse {
  id: number;
  tubo_concepto: string;
  num_paqs: number;
  resto: number;
  operario_completo: string;
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

export async function listarSalidasPaqsService(
  pool: ConnectionPool,
  params: ListarSalidasPaqsParams,
): Promise<PaginatedResult<SalidaPaqueteTubo>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 10);

  const rowStart = (page - 1) * limit + 1;
  const rowEnd = page * limit;

  const orderCol = params.orderBy || "id";
  const orderDir = params.orderDir === "ASC" ? "ASC" : "DESC";

  const request = pool.request();
  const whereClauses: string[] = [];

  // Aplicación de Filtros específicos del módulo
  if (params.filtros) {
    const { busqueda, operario, calidad, fechaInicio, fechaFin } =
      params.filtros;

    if (busqueda) {
      whereClauses.push(`(t.art_concepto LIKE @busqueda)`);
      request.input("busqueda", `%${busqueda}%`);
    }
    if (operario !== undefined && operario !== null && operario !== 0) {
      whereClauses.push(`spt.operario_id = @operario`);
      request.input("operario", operario);
    }
    if (calidad !== undefined && calidad !== null && calidad !== 0) {
      whereClauses.push(`t.calidad_id = @calidad`);
      request.input("calidad", calidad);
    }
    if (fechaInicio) {
      whereClauses.push(`spt.creado >= @fechaInicio`);
      request.input("fechaInicio", `${fechaInicio} 00:00:00.000`);
    }
    if (fechaFin) {
      whereClauses.push(`spt.creado < @fechaFin`);
      request.input("fechaFin", `${fechaFin} 23:59:59.999`);
    }
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const mapeoColumnas: Record<string, string> = {
    id: "spt.id",
    tubo: "t.art_concepto",
    num_paqs: "spt.num_paqs",
    operario: "o.nombre",
    fecha: "spt.creado",
  };

  const safeOrderCol = mapeoColumnas[orderCol] || "spt.id";

  const query = `
    WITH SalidasPaqsPaginadas AS (
        SELECT
            spt.id,
            t.art_concepto AS tubo_concepto,
            spt.num_paqs,
            spt.resto,
            o.nombre + ' ' + o.apellido1 + ' ' + o.apellido2 AS operario_completo,
            spt.creado,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderCol} ${orderDir}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Salidas_Paqs_Tubos AS spt
        LEFT JOIN Tubos AS t ON spt.tubo_id = t.id
        LEFT JOIN Operarios AS o ON spt.operario_id = o.id
        ${whereSql}
    )
    SELECT *
    FROM SalidasPaqsPaginadas
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  request.input("rowStart", rowStart);
  request.input("rowEnd", rowEnd);

  const result = await request.query(query);

  // Mapear los resultados crudos de SQL al formato limpio de la interfaz
  const data: SalidaPaqueteTubo[] = result.recordset.map(
    (row: SalidaPaqueteRawResponse) => {
      return {
        id: row.id,
        tubo: row.tubo_concepto || "",
        num_paqs: row.num_paqs || 0,
        resto: row.resto || 0,
        operario: row.operario_completo || "",
        action_id: row.id,
        fecha: row.creado,
      };
    },
  );

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
export interface FiltrosSalidasPaquetesDinámicos {
  calidadId?: number;
  operarioId?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarFiltrosSalidasPaquetesParams {
  filtros?: FiltrosSalidasPaquetesDinámicos;
}

export interface ListarFiltrosSalidasPaquetesResponse {
  calidades: { id: number; calidad: string }[];
  operarios: { id: number; nombre: string }[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

export async function listarFiltrosSalidasPaquetesService(
  pool: ConnectionPool,
  params: ListarFiltrosSalidasPaquetesParams,
): Promise<ListarFiltrosSalidasPaquetesResponse> {
  const { filtros } = params;
  const calidadId = filtros?.calidadId;
  const operarioId = filtros?.operarioId;
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

  const reqCalidades = pool.request();
  const reqOperarios = pool.request();
  const reqFechas = pool.request();

  // --- QUERY 1: CALIDADES ---
  let whereCalidades = "WHERE 1=1";
  if (operarioId) {
    whereCalidades += " AND sp.operario_id = @operarioId";
    reqCalidades.input("operarioId", operarioId);
  }
  if (fInicioParam) {
    whereCalidades += " AND sp.creado >= @fechaInicio";
    reqCalidades.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereCalidades += " AND sp.creado < @fechaFinLimite";
    reqCalidades.input("fechaFinLimite", fechaFinLimite);
  }
  const qCalidades = `
    SELECT DISTINCT tc.id, tc.nombre as calidad
    FROM Salidas_Paqs_Tubos sp
    INNER JOIN Tubos t ON sp.tubo_id = t.id
    INNER JOIN Tipos_Calidad tc ON t.calidad_id = tc.id
    ${whereCalidades}
    ORDER BY tc.nombre ASC; 
  `;

  // --- QUERY 2: OPERARIOS ---
  let whereOperarios = "WHERE 1=1";
  if (calidadId) {
    whereOperarios += " AND t.calidad_id = @calidadId";
    reqOperarios.input("calidadId", calidadId);
  }
  if (fInicioParam) {
    whereOperarios += " AND sp.creado >= @fechaInicio";
    reqOperarios.input("fechaInicio", fInicioParam);
  }
  if (fechaFinLimite) {
    whereOperarios += " AND sp.creado < @fechaFinLimite";
    reqOperarios.input("fechaFinLimite", fechaFinLimite);
  }
  const qOperarios = `
    SELECT DISTINCT o.id, o.nombre + ' ' + o.apellido1 + ' ' + o.apellido2 AS nombre_completo
    FROM Salidas_Paqs_Tubos sp
    INNER JOIN Operarios o ON sp.operario_id = o.id
    LEFT JOIN Tubos t ON sp.tubo_id = t.id
    ${whereOperarios}
    ORDER BY nombre_completo ASC;
  `;

  // --- QUERY 3: RANGO DE FECHAS ---
  let whereFechas = "WHERE 1=1";
  if (calidadId) {
    whereFechas += " AND t.calidad_id = @calidadId";
    reqFechas.input("calidadId", calidadId);
  }
  if (operarioId) {
    whereFechas += " AND sp.operario_id = @operarioId";
    reqFechas.input("operarioId", operarioId);
  }
  const qFechas = `
    SELECT 
      MIN(sp.creado) AS minFecha, 
      MAX(sp.creado) AS maxFecha
    FROM Salidas_Paqs_Tubos sp
    LEFT JOIN Tubos t ON sp.tubo_id = t.id
    ${whereFechas};
  `;

  // Ejecución paralela de las 3 consultas en Salidas
  const [resCalidades, resOperarios, resFechas] = await Promise.all([
    reqCalidades.query(qCalidades),
    reqOperarios.query(qOperarios),
    reqFechas.query(qFechas),
  ]);

  return {
    calidades: resCalidades.recordset.map((row) => ({
      id: row.id,
      calidad: row.calidad,
    })),
    operarios: resOperarios.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre_completo,
    })),
    rangoFechas: {
      minFecha: resFechas.recordset[0]?.minFecha || null,
      maxFecha: resFechas.recordset[0]?.maxFecha || null,
    },
  };
}
