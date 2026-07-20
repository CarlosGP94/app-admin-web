import { ConnectionPool, Request } from "mssql";

export interface FiltrosBobinas {
  calidadId?: number;
  fabricanteId?: number;
  buscar?: string;
  activa?: boolean;
  espesor?: number;
}

export interface ListarBobinasParams {
  page?: number;
  pageSize?: number;
  orderBy?: "unidades" | "peso_medio" | "concepto";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosBobinas;
}

export interface BobinaRow {
  id: number;
  concepto: string;
  activa: boolean;
  unidades: number;
  peso_medio: number;
  action_id: number;
  fecha: string;
}

export interface ListarBobinasResponse {
  data: BobinaRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listarBobinasService(
  pool: ConnectionPool,
  params: ListarBobinasParams,
): Promise<ListarBobinasResponse> {
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
    whereClauses += " AND b.calidad_id = @calidadId";
    req.input("calidadId", filtros.calidadId);
  }

  if (filtros?.fabricanteId) {
    whereClauses += " AND b.fabricante_id = @fabricanteId";
    req.input("fabricanteId", filtros.fabricanteId);
  }

  if (filtros?.activa !== undefined) {
    whereClauses += " AND b.activa = @activa";
    req.input("activa", filtros.activa);
  }

  if (filtros?.espesor) {
    whereClauses += " AND b.espesor = @espesor";
    req.input("espesor", filtros.espesor);
  }

  if (filtros?.buscar) {
    whereClauses += " AND b.concepto LIKE @buscar";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  // 2. Determinar el orden seguro para meter en el ROW_NUMBER()
  let safeOrderBySql = "";

  if (orderBy) {
    const columnasPermitidas = {
      unidades: "b.unidades",
      peso_medio: "b.peso_medio",
      concepto: "b.concepto",
    };
    // Validamos la dirección para evitar inyecciones
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    const tieneFiltros =
      filtros?.calidadId || filtros?.fabricanteId || filtros?.buscar;
    if (tieneFiltros) {
      safeOrderBySql = "b.espesor ASC, b.ancho ASC, b.concepto ASC, b.id ASC";
    } else {
      safeOrderBySql = "b.id DESC";
    }
  }

  // 3. Query paginada usando CTE compatible con SQL 2008
  // TotalCount usa COUNT(*) OVER() para devolver el total sin hacer otra query
  const query = `
    WITH BobinasPaginadas AS (
        SELECT
            b.id,
            b.concepto,
            b.activa,
            b.unidades,
            b.peso_medio,
            b.creado AS fecha,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Bobinas b
        ${whereClauses}
    )
    SELECT *
    FROM BobinasPaginadas
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  // Inyectar los parámetros de límites de filas
  req.input("rowStart", rowStart);
  req.input("rowEnd", rowEnd);

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  // Extraer el total del primer registro devuelto (si existe)
  const total = rows.length > 0 ? rows[0].TotalCount : 0;

  return {
    data: rows.map((row) => ({
      id: row.id,
      action_id: row.id,
      concepto: row.concepto,
      activa: row.activa,
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

export interface FiltrosBobinasParams {
  filtros?: {
    busqueda?: string;
    calidadId?: number;
    fabricanteId?: number;
    espesor?: number;
  };
}

export interface ListarFiltrosBobinasResponse {
  fabricantes: Array<{ id: number; nombre: string }>;
  calidades: Array<{ id: number; nombre: string }>;
  espesores: number[];
}

export async function listarFiltrosBobinasService(
  pool: ConnectionPool,
  params: FiltrosBobinasParams,
): Promise<ListarFiltrosBobinasResponse> {
  const { filtros } = params;

  const calidadId = filtros?.calidadId;
  const fabricanteId = filtros?.fabricanteId;
  const espesor = filtros?.espesor;

  // 2. Inicializar requests individuales para evitar colisiones en la ejecución paralela
  const reqFabricantes = pool.request();
  const reqCalidades = pool.request();
  const reqEspesores = pool.request();

  // Helper para inyectar filtros comunes basados en el request actual
  const aplicarFiltrosComunes = (req: Request, omitir: string) => {
    let sql = "";

    if (calidadId && omitir !== "calidad") {
      sql += " AND b.calidad_id = @calidadId";
      req.input("calidadId", calidadId);
    }
    if (fabricanteId && omitir !== "fabricante") {
      sql += " AND b.fabricante_id = @fabricanteId";
      req.input("fabricanteId", fabricanteId);
    }
    if (espesor && omitir !== "espesor") {
      sql += " AND b.espesor = @espesor";
      req.input("espesor", espesor);
    }
    return sql;
  };

  // --- QUERY 1: FABRICANTES ---
  const whereFabricantes =
    "WHERE 1=1" + aplicarFiltrosComunes(reqFabricantes, "fabricante");
  const qFabricantes = `
    SELECT DISTINCT f.id, f.nombre
    FROM Bobinas b
    INNER JOIN Fabricantes f ON b.fabricante_id = f.id
    ${whereFabricantes}
    ORDER BY f.nombre ASC;
  `;

  // --- QUERY 2: CALIDADES ---
  const whereCalidades =
    "WHERE 1=1" + aplicarFiltrosComunes(reqCalidades, "calidad");
  const qCalidades = `
    SELECT DISTINCT tc.id, tc.nombre as calidad
    FROM Bobinas b
    INNER JOIN Tipos_Calidad tc ON b.calidad_id = tc.id
    ${whereCalidades}
    ORDER BY tc.nombre ASC;
  `;

  // --- QUERY 3: ESPESORES ---
  const whereEspesores =
    "WHERE 1=1" + aplicarFiltrosComunes(reqEspesores, "espesor");
  const qEspesores = `
    SELECT DISTINCT b.espesor
    FROM Bobinas b
    ${whereEspesores}
    ORDER BY b.espesor ASC;
  `;

  // 3. Ejecución paralela de las 4 consultas en Bobinas
  const [resFabricantes, resCalidades, resEspesores] = await Promise.all([
    reqFabricantes.query(qFabricantes),
    reqCalidades.query(qCalidades),
    reqEspesores.query(qEspesores),
  ]);

  // 4. Mapear y retornar la respuesta estructurada para el frontend
  return {
    fabricantes: resFabricantes.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre,
    })),
    calidades: resCalidades.recordset.map((row) => ({
      id: row.id,
      nombre: row.calidad,
    })),
    espesores: resEspesores.recordset.map((row) => row.espesor),
  };
}
