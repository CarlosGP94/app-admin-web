// lib/services/bobinas-cortadas.service.ts
import type { ConnectionPool } from "mssql";

// 1. Interfaces para tipar la entrada y salida de datos
export interface FiltrosBobinasCortadas {
  busqueda?: string;
  ancho?: number;
  espesor?: string;
  fabricante?: string;
  colada?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarBobinasCortadasParams {
  filtros?: FiltrosBobinasCortadas;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

export interface BobinaCortada {
  id: number;
  bobina_concepto: string;
  turno_prefijo: string;
  operario: string;
  colada: string;
  action_id: number;
  fecha: Date;
}
export interface BobinaCortadaItemResponse {
  id: number;
  bobina_concepto: string;
  turno_prefijo: string;
  operario: string;
  colada: string;
  action_id: number;
  creado: Date;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listarBobinasCortadasService(
  pool: ConnectionPool,
  params: ListarBobinasCortadasParams,
): Promise<PaginatedResult<BobinaCortada>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, params.limit || 10);

  const rowStart = (page - 1) * limit + 1;
  const rowEnd = page * limit;

  const orderCol = params.orderBy || ("id" as keyof BobinaCortada);
  const orderDir = params.orderDir === "ASC" ? "ASC" : "DESC";

  const request = pool.request();

  // Construcción dinámica de la cláusula WHERE
  const whereClauses: string[] = [];

  if (params.filtros) {
    const {
      busqueda,
      ancho,
      espesor,
      fabricante,
      colada,
      fechaInicio,
      fechaFin,
    } = params.filtros;
    if (busqueda) {
      whereClauses.push(`(b.concepto LIKE @busqueda)`);
      request.input("busqueda", `%${busqueda}%`);
    }
    if (ancho !== undefined && ancho !== null && ancho !== 0) {
      whereClauses.push(`b.ancho = @ancho`);
      request.input("ancho", params.filtros.ancho);
    }
    if (
      espesor !== undefined &&
      espesor !== null &&
      espesor !== "" &&
      espesor !== "0"
    ) {
      whereClauses.push(`b.espesor = @espesor`);
      request.input("espesor", espesor);
    }
    if (
      fabricante !== undefined &&
      fabricante !== null &&
      fabricante !== "" &&
      fabricante !== "0"
    ) {
      whereClauses.push(`b.fabricante_id = @fabricante`);
      request.input("fabricante", fabricante);
    }
    if (
      colada !== undefined &&
      colada !== null &&
      colada !== "" &&
      colada !== "0"
    ) {
      whereClauses.push(`bc.colada_id = @colada`);
      request.input("colada", colada);
    }
    if (
      fechaInicio !== undefined &&
      fechaInicio !== null &&
      fechaInicio !== ""
    ) {
      whereClauses.push(`bc.creado >= @fechaInicio`);
      request.input("fechaInicio", fechaInicio);
    }
    if (fechaFin !== undefined && fechaFin !== null && fechaFin !== "") {
      whereClauses.push(`bc.creado <= @fechaFin`);
      request.input("fechaFin", fechaFin);
    }
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const mapeoColumnas = {
    id: "bc.id",
    creado: "bc.creado",
    turno_id: "t.prefijo",
    colada: "bcol.colada",
    bobina_concepto: "b.concepto",
    operario: "o.nombre + ' ' + o.apellido1 + ' ' + o.apellido2",
  };

  const safeOrderCol =
    mapeoColumnas[orderCol as keyof typeof mapeoColumnas] || "bc.id";

  const query = `
    WITH BobinasCortadasPaginados AS (
        SELECT
            bc.id, 
            b.concepto AS bobina_concepto,
            t.prefijo AS turno_prefijo,
            o.nombre + ' ' + o.apellido1 + ' ' + o.apellido2 AS operario,
            bcol.colada AS colada,
            bc.creado,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderCol} ${orderDir}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Bobinas_Cortadas as bc
        LEFT JOIN Bobinas as b ON bc.bobina_id = b.id
        LEFT JOIN Bobina_Coladas as bcol ON bc.colada_id = bcol.id
        LEFT JOIN Turnos as t ON bc.turno_id = t.id
        LEFT JOIN Operarios as o ON bc.operario_id = o.id
        ${whereSql}
    )
    SELECT *
    FROM BobinasCortadasPaginados
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  request.input("rowStart", rowStart);
  request.input("rowEnd", rowEnd);

  const result = await request.query(query);

  const data: BobinaCortada[] = result.recordset.map(
    (row: BobinaCortadaItemResponse) => ({
      id: row.id,
      bobina_concepto: row.bobina_concepto,
      turno_prefijo: row.turno_prefijo,
      operario: row.operario,
      colada: row.colada,
      action_id: row.action_id,
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

export interface ListarFiltrosBobinasCortadasParams {
  filtros?: FiltrosBobinasCortadas;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: "ASC" | "DESC";
}

export interface ListarFiltrosBobinasCortadasParams {
  busqueda?: string;
  colada?: string;
  fabricante?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarFiltrosBobinasCortadasResponse {
  coladas: {
    id: number;
    colada: string;
  }[];
  fabricantes: { id: number; nombre: string }[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

export async function listarFiltrosBobinasCortadasService(
  pool: ConnectionPool,
  params: ListarFiltrosBobinasCortadasParams,
): Promise<ListarFiltrosBobinasCortadasResponse> {
  const { colada, fabricante, fechaInicio, fechaFin } = params;

  const reqColadas = pool.request();
  const reqFabricantes = pool.request();
  const reqFechas = pool.request();

  let whereColadas = "WHERE 1=1";

  if (fabricante) {
    whereColadas += " AND bcol.fabricante_id = @fabricante";
    reqColadas.input("fabricante", fabricante);
  }
  if (fechaInicio) {
    whereColadas += " AND bc.creado >= @fechaInicio";
    reqColadas.input("fechaInicio", fechaInicio);
  }
  if (fechaFin) {
    whereColadas += " AND bc.creado <= @fechaFin";
    reqColadas.input("fechaFin", fechaFin);
  }

  const qColadas = `
    SELECT DISTINCT bcol.id, bcol.colada AS colada
    FROM Bobinas_Cortadas bc
    INNER JOIN Bobinas b ON bc.bobina_id = b.id
    INNER JOIN Bobina_Coladas bcol ON bc.colada_id = bcol.id
    ${whereColadas}
    ORDER BY bcol.colada ASC;
  `;

  let whereFabricantes = "WHERE 1=1";
  if (colada) {
    whereFabricantes += " AND bc.colada_id = @colada";
    reqFabricantes.input("colada", colada);
  }
  if (fechaInicio) {
    whereFabricantes += " AND bc.creado >= @fechaInicio";
    reqFabricantes.input("fechaInicio", fechaInicio);
  }
  if (fechaFin) {
    whereFabricantes += " AND bc.creado <= @fechaFin";
    reqFabricantes.input("fechaFin", fechaFin);
  }

  const qFabricantes = `
    SELECT DISTINCT f.id, f.nombre
    FROM Bobinas_Cortadas bc
    INNER JOIN Bobinas b ON bc.bobina_id = b.id
    INNER JOIN Fabricantes f ON b.fabricante_id = f.id
    LEFT JOIN Bobina_Coladas bcol ON bc.colada_id = bcol.id
    ${whereFabricantes}
    ORDER BY f.nombre ASC;
  `;

  let whereFechas = "WHERE 1=1";
  if (colada) {
    whereFechas += " AND bc.colada_id = @colada";
    reqFechas.input("colada", colada);
  }
  if (fabricante) {
    whereFechas += " AND b.fabricante_id = @fabricante";
    reqFechas.input("fabricante", fabricante);
  }

  const qFechas = `
    SELECT 
      MIN(bc.creado) AS minFecha, 
      MAX(bc.creado) AS maxFecha
    FROM Bobinas_Cortadas bc
    LEFT JOIN Bobinas b ON bc.bobina_id = b.id
    LEFT JOIN Bobina_Coladas bcol ON bc.colada_id = bcol.id
    ${whereFechas};
  `;

  const [resColadas, resFabricantes, resFechas] = await Promise.all([
    reqColadas.query(qColadas),
    reqFabricantes.query(qFabricantes),
    reqFechas.query(qFechas),
  ]);

  return {
    coladas: resColadas.recordset.map((row) => ({
      id: row.id,
      colada: row.colada,
    })),
    fabricantes: resFabricantes.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre,
    })),
    rangoFechas: {
      minFecha: resFechas.recordset[0]?.minFecha || null,
      maxFecha: resFechas.recordset[0]?.maxFecha || null,
    },
  };
}
