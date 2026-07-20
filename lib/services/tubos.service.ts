import { ConnectionPool, Request } from "mssql";

export interface FiltrosTubos {
  calidadId?: number;
  tipoId?: number;
  espesor?: number;
  buscar?: string;
  activo?: boolean;
}

export interface ListarTubosParams {
  page?: number;
  pageSize?: number;
  orderBy?: "unidades" | "num_paquetes" | "peso_total" | "art_concepto";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosTubos;
}

export interface TuboRow {
  id: number;
  art_concepto: string;
  activo: boolean;
  peso_unitario: number;
  peso_total: number;
  num_paquetes: number;
  num_por_paq: number;
  resto: number;
  unidades: number;
  alto_paq: number;
  ancho_paq: number;
  action_id: number;
  fecha: string;
}

export interface ListarTubosResponse {
  data: TuboRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar los Tubos
 */
export async function listarTubosService(
  pool: ConnectionPool,
  params: ListarTubosParams,
): Promise<ListarTubosResponse> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

  // Cálculo de límites para el BETWEEN (basado en indexación 1)
  const rowStart = (page - 1) * pageSize + 1;
  const rowEnd = page * pageSize;

  const { filtros, orderBy, orderDir = "ASC" } = params;
  const req = pool.request();

  // 1. Construcción dinámica de Cláusulas WHERE
  let whereClauses = "WHERE 1=1";

  if (filtros?.calidadId) {
    whereClauses += " AND t.calidad_id = @calidadId";
    req.input("calidadId", filtros.calidadId);
  }

  if (filtros?.tipoId) {
    whereClauses += " AND t.tipo_id = @tipoId";
    req.input("tipoId", filtros.tipoId);
  }

  if (filtros?.espesor) {
    whereClauses += " AND t.espesor = @espesor";
    req.input("espesor", filtros.espesor);
  }

  if (filtros?.activo !== undefined) {
    whereClauses += " AND t.activo = @activo";
    req.input("activo", filtros.activo);
  }

  if (filtros?.buscar) {
    whereClauses += " AND t.art_concepto LIKE @buscar";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  // 2. Determinar el orden seguro para inyectar en ROW_NUMBER()
  let safeOrderBySql = "";

  if (orderBy) {
    const columnasPermitidas = {
      unidades: "t.unidades",
      num_paquetes: "t.num_paquetes",
      peso_total: "t.peso_total",
      art_concepto: "t.art_concepto",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    // Si hay filtros aplicados pero no un orden explícito, priorizamos agrupaciones naturales
    const tieneFiltros =
      filtros?.calidadId ||
      filtros?.tipoId ||
      filtros?.espesor ||
      filtros?.buscar;
    if (tieneFiltros) {
      safeOrderBySql = "t.espesor ASC, t.art_concepto ASC, t.id ASC";
    } else {
      safeOrderBySql = "t.id DESC"; // Orden por defecto estándar
    }
  }

  // 3. Query paginada con CTE compatible con SQL 2008
  const query = `
    WITH TubosPaginados AS (
        SELECT
            t.id,
            t.art_concepto,
            t.activo,
            t.peso_unitario,
            t.peso_total,
            t.num_paquetes,
            t.num_por_paq,
            CASE 
                WHEN (t.unidades - t.num_paquetes * t.num_por_paq) < 0 THEN 0 
                ELSE (t.unidades - t.num_paquetes * t.num_por_paq) 
            END AS resto,
            t.unidades,
            t.alto_paq,
            t.ancho_paq,
            t.creado AS fecha,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Tubos t
        ${whereClauses}
    )
    SELECT *
    FROM TubosPaginados
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
      art_concepto: row.art_concepto,
      activo: row.activo,
      peso_unitario: row.peso_unitario,
      peso_total: row.peso_total,
      num_paquetes: row.num_paquetes,
      num_por_paq: row.num_por_paq,
      resto: row.resto,
      unidades: row.unidades,
      alto_paq: row.alto_paq,
      ancho_paq: row.ancho_paq,
      fecha: row.fecha ? new Date(row.fecha).toISOString() : "",
    })),
    total,
    page,
    pageSize,
  };
}

export interface FiltrosTubosParams {
  filtros?: {
    busqueda?: string;
    calidadId?: number;
    tipoId?: number;
    espesor?: number;
  };
}

export interface ListarFiltrosTubosResponse {
  calidades: Array<{ id: number; nombre: string }>;
  tipos: Array<{ id: number; nombre: string }>;
  espesores: number[];
}

/**
 * Servicio para obtener selectores dinámicos y dependientes cruzados de los Tubos
 */
export async function listarFiltrosTubosService(
  pool: ConnectionPool,
  params: FiltrosTubosParams,
): Promise<ListarFiltrosTubosResponse> {
  const { filtros } = params;

  const calidadId = filtros?.calidadId;
  const tipoId = filtros?.tipoId;
  const espesor = filtros?.espesor;

  const reqCalidades = pool.request();
  const reqTipos = pool.request();
  const reqEspesores = pool.request();

  // Helper para inyectar dependencias dinámicas evitando que un filtro se anule a sí mismo en su propio selector
  const aplicarFiltrosComunes = (req: Request, omitir: string) => {
    let sql = "";

    if (calidadId && omitir !== "calidad") {
      sql += " AND t.calidad_id = @calidadId";
      req.input("calidadId", calidadId);
    }
    if (tipoId && omitir !== "tipo") {
      sql += " AND t.tipo_id = @tipoId";
      req.input("tipoId", tipoId);
    }
    if (espesor && omitir !== "espesor") {
      sql += " AND t.espesor = @espesor";
      req.input("espesor", espesor);
    }
    return sql;
  };

  // --- QUERY 1: CALIDADES ---
  const whereCalidades =
    "WHERE 1=1" + aplicarFiltrosComunes(reqCalidades, "calidad");
  const qCalidades = `
    SELECT DISTINCT tc.id, tc.nombre as calidad
    FROM Tubos t
    INNER JOIN Tipos_Calidad tc ON t.calidad_id = tc.id
    ${whereCalidades}
    ORDER BY tc.nombre ASC;
  `;

  // --- QUERY 2: TIPOS ---
  const whereTipos = "WHERE 1=1" + aplicarFiltrosComunes(reqTipos, "tipo");
  const qTipos = `
    SELECT DISTINCT tt.id, tt.nombre as tipo
    FROM Tubos t
    INNER JOIN Tipos_Tubos tt ON t.tipo_id = tt.id
    ${whereTipos}
    ORDER BY tt.nombre ASC;
  `;

  // --- QUERY 3: ESPESORES ---
  const whereEspesores =
    "WHERE 1=1" + aplicarFiltrosComunes(reqEspesores, "espesor");
  const qEspesores = `
    SELECT DISTINCT t.espesor
    FROM Tubos t
    ${whereEspesores}
    ORDER BY t.espesor ASC;
  `;

  // Ejecución paralela en el Connection Pool
  const [resCalidades, resTipos, resEspesores] = await Promise.all([
    reqCalidades.query(qCalidades),
    reqTipos.query(qTipos),
    reqEspesores.query(qEspesores),
  ]);

  return {
    calidades: resCalidades.recordset.map((row) => ({
      id: row.id,
      nombre: row.calidad,
    })),
    tipos: resTipos.recordset.map((row) => ({
      id: row.id,
      nombre: row.tipo,
    })),
    espesores: resEspesores.recordset.map((row) => row.espesor),
  };
}
