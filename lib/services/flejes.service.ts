import { ConnectionPool, Request } from "mssql";

export interface FiltrosFlejes {
  calidadId?: number;
  buscar?: string;
  activa?: boolean;
  espesor?: number;
}

export interface ListarFlejesParams {
  page?: number;
  pageSize?: number;
  orderBy?: "unidades" | "peso_medio" | "concepto";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosFlejes;
}

export interface FlejeRow {
  id: number;
  concepto: string;
  activo: boolean;
  unidades: number;
  peso_medio: number;
  action_id: number;
  fecha: string;
  espesor?: number;
  ancho?: number;
}

export interface ListarFlejesResponse {
  data: FlejeRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listarFlejesService(
  pool: ConnectionPool,
  params: ListarFlejesParams,
): Promise<ListarFlejesResponse> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

  // Cálculo de límites para el BETWEEN (basado en 1)
  const rowStart = (page - 1) * pageSize + 1;
  const rowEnd = page * pageSize;

  const { filtros, orderBy, orderDir = "ASC" } = params;
  const req = pool.request();

  // 1. Construcción de Cláusulas WHERE
  let whereClauses = "WHERE 1=1";

  if (filtros?.calidadId) {
    whereClauses += " AND f.calidad_id = @calidadId";
    req.input("calidadId", filtros.calidadId);
  }

  if (filtros?.activa !== undefined) {
    whereClauses += " AND f.activa = @activa";
    req.input("activa", filtros.activa);
  }

  if (filtros?.espesor) {
    whereClauses += " AND f.espesor = @espesor";
    req.input("espesor", filtros.espesor);
  }

  if (filtros?.buscar) {
    whereClauses += " AND f.concepto LIKE @buscar";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  // 2. Determinar el orden seguro para meter en el ROW_NUMBER()
  let safeOrderBySql = "";

  if (orderBy) {
    const columnasPermitidas = {
      unidades: "f.unidades",
      peso_medio: "f.peso_medio",
      concepto: "f.concepto",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    const tieneFiltros =
      filtros?.calidadId || filtros?.buscar || filtros?.espesor;
    if (tieneFiltros) {
      safeOrderBySql = "f.espesor ASC, f.ancho ASC, f.concepto ASC, f.id ASC";
    } else {
      safeOrderBySql = "f.id DESC"; // Orden por defecto solicitado
    }
  }

  // 3. Query paginada usando CTE compatible con SQL 2008
  const query = `
    WITH FlejesPaginados AS (
        SELECT
            f.id,
            f.concepto,
            f.activo,
            f.unidades,
            f.peso_medio,
            f.espesor,
            f.ancho,
            f.creado AS fecha,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Flejes f
        ${whereClauses}
    )
    SELECT *
    FROM FlejesPaginados
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
      concepto: row.concepto,
      activo: row.activo,
      unidades: row.unidades,
      peso_medio: row.peso_medio,
      fecha: row.fecha ? new Date(row.fecha).toISOString() : "",
      espesor: row.espesor,
      ancho: row.ancho,
    })),
    total,
    page,
    pageSize,
  };
}

export interface FiltrosFlejesParams {
  filtros?: {
    busqueda?: string;
    calidadId?: number;
    espesor?: number;
  };
}

export interface ListarFiltrosFlejesResponse {
  calidades: Array<{ id: number; nombre: string }>;
  espesores: number[];
}

export async function listarFiltrosFlejesService(
  pool: ConnectionPool,
  params: FiltrosFlejesParams,
): Promise<ListarFiltrosFlejesResponse> {
  const { filtros } = params;

  const calidadId = filtros?.calidadId;
  const espesor = filtros?.espesor;

  const reqCalidades = pool.request();
  const reqEspesores = pool.request();

  // Helper para inyectar filtros cruzados dinámicos
  const aplicarFiltrosComunes = (req: Request, omitir: string) => {
    let sql = "";

    if (calidadId && omitir !== "calidad") {
      sql += " AND f.calidad_id = @calidadId";
      req.input("calidadId", calidadId);
    }
    if (espesor && omitir !== "espesor") {
      sql += " AND f.espesor = @espesor";
      req.input("espesor", espesor);
    }
    return sql;
  };

  // --- QUERY 1: CALIDADES ---
  const whereCalidades =
    "WHERE 1=1" + aplicarFiltrosComunes(reqCalidades, "calidad");
  const qCalidades = `
    SELECT DISTINCT tc.id, tc.nombre as calidad
    FROM Flejes f
    INNER JOIN Tipos_Calidad tc ON f.calidad_id = tc.id
    ${whereCalidades}
    ORDER BY tc.nombre ASC;
  `;

  // --- QUERY 2: ESPESORES ---
  const whereEspesores =
    "WHERE 1=1" + aplicarFiltrosComunes(reqEspesores, "espesor");
  const qEspesores = `
    SELECT DISTINCT f.espesor
    FROM Flejes f
    ${whereEspesores}
    ORDER BY f.espesor ASC;
  `;

  // Ejecución en paralelo de las consultas estructuradas
  const [resCalidades, resEspesores] = await Promise.all([
    reqCalidades.query(qCalidades),
    reqEspesores.query(qEspesores),
  ]);

  return {
    calidades: resCalidades.recordset.map((row) => ({
      id: row.id,
      nombre: row.calidad,
    })),
    espesores: resEspesores.recordset.map((row) => row.espesor),
  };
}

// Listar todos
export interface FlejeSelectorOption {
  id: number;
  concepto: string;
}

export async function listarFlejesSelectorService(
  pool: ConnectionPool,
): Promise<FlejeSelectorOption[]> {
  const req = pool.request();

  const query = `
    SELECT 
        f.id,
        f.concepto
    FROM Flejes f
    INNER JOIN Tipos_Calidad tc ON f.calidad_id = tc.id
    WHERE f.activo = 1
    ORDER BY 
        tc.nombre ASC,
        f.espesor ASC,
        f.ancho ASC,
        f.concepto ASC,
        f.id ASC;
  `;

  const resultado = await req.query(query);

  return resultado.recordset.map((row) => ({
    id: row.id,
    concepto: row.concepto,
  }));
}
