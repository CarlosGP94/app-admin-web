// lib/services/planes-corte.service.ts
import type { ConnectionPool } from "mssql";

// 1. Interfaces para tipar la entrada y salida de datos
export interface FiltrosPlanesCorte {
  busqueda?: string;
  ancho_estipulado?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarPlanesCorteParams {
  filtros?: FiltrosPlanesCorte;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

export interface PlanCorte {
  id: number;
  ancho_estipulado: string;
  fecha: Date;
}
export interface PlanCorteItemResponse {
  id: number;
  ancho_estipulado: string;
  creado: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Servicio corregido y optimizado para SQL Server 2008
 */
export async function listarPlanesCorteService(
  pool: ConnectionPool,
  params: ListarPlanesCorteParams,
): Promise<PaginatedResult<PlanCorte>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 10);

  const rowStart = (page - 1) * limit + 1;
  const rowEnd = page * limit;

  const orderCol = params.orderBy || "id";
  const orderDir = params.orderDir === "ASC" ? "ASC" : "DESC";

  const request = pool.request();

  // Construcción dinámica de la cláusula WHERE
  const whereClauses: string[] = [];

  if (params.filtros) {
    const { busqueda, ancho_estipulado, fechaInicio, fechaFin } =
      params.filtros;
    if (busqueda) {
      whereClauses.push(`(id LIKE @busqueda)`);
      request.input("busqueda", `%${busqueda}%`);
    }
    if (
      ancho_estipulado !== undefined &&
      ancho_estipulado !== null &&
      ancho_estipulado !== 0
    ) {
      whereClauses.push(`ancho_estipulado = @ancho_estipulado`);
      request.input("ancho_estipulado", params.filtros.ancho_estipulado);
    }
    if (fechaInicio) {
      whereClauses.push(`creado >= @fechaInicio`);
      request.input("fechaInicio", fechaInicio);
    }
    if (fechaFin) {
      whereClauses.push(`creado <= @fechaFin`);
      request.input("fechaFin", fechaFin);
    }
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const columnasPermitidas = ["id", "creado", "ancho_estipulado"];
  const safeOrderCol = columnasPermitidas.includes(orderCol) ? orderCol : "id";

  const query = `
    WITH PlanesPaginados AS (
        SELECT
            *,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderCol} ${orderDir}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Planes_Corte
        ${whereSql}
    )
    SELECT *
    FROM PlanesPaginados
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  request.input("rowStart", rowStart);
  request.input("rowEnd", rowEnd);

  const result = await request.query(query);

  // Mapeamos los resultados obtenidos de la base de datos
  const data: PlanCorte[] = result.recordset.map(
    (row: PlanCorteItemResponse) => ({
      id: row.id,
      ancho_estipulado: row.ancho_estipulado,
      fecha: row.creado,
    }),
  );

  // Obtenemos el conteo total del registro auxiliar de la primera fila
  const total = result.recordset[0]?.TotalCount || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    data: data,
    total: total,
    page: page,
    limit: limit,
    totalPages: totalPages,
  };
}

export async function listarAnchosPlanesCorteService(
  pool: ConnectionPool,
): Promise<number[]> {
  const query = `
    SELECT DISTINCT ancho_estipulado
    FROM Planes_Corte
    Order BY ancho_estipulado ASC
  `;

  const result = await pool.request().query(query);
  return result.recordset.map(
    (row: { ancho_estipulado: number }) => row.ancho_estipulado,
  );
}
