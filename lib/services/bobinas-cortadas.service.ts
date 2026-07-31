// lib/services/bobinas-cortadas.service.ts
import type { ConnectionPool } from "mssql";
import { Transaction, Request } from "mssql";

// 1. Interfaces para tipar la entrada y salida de datos
export interface FiltrosBobinasCortadas {
  busqueda?: string;
  planCorte?: number;
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
  fabricante_id: number;
  calidad_id: number;
  action_id: number;
  fecha: Date;
}
export interface BobinaCortadaItemResponse {
  id: number;
  bobina_concepto: string;
  turno_prefijo: string;
  operario: string;
  colada: string;
  fabricante_id: number;
  calidad_id: number;
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
  params: ListarBobinasCortadasParams
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
      planCorte,
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
    if (planCorte !== undefined && planCorte !== null && planCorte !== 0) {
      whereClauses.push(`bc.plan_corte_id = @planCorte`);
      request.input("planCorte", planCorte);
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
    if (fechaInicio) {
      whereClauses.push(`bc.creado >= @fechaInicio`);
      request.input("fechaInicio", `${fechaInicio} 00:00:00.000`);
    }
    if (fechaFin) {
      whereClauses.push(`bc.creado < @fechaFin`);
      request.input("fechaFin", `${fechaFin} 23:59:59.999`);
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
            b.fabricante_id,
            b.calidad_id,
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
      fabricante_id: row.fabricante_id,
      calidad_id: row.calidad_id,
    })
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
  params: ListarFiltrosBobinasCortadasParams
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

// Interfaz para la entrada del servicio de actualización masiva
export interface ActualizarColadaBobinasCortadasParams {
  ids: number[];
  colada_id?: number | null;
  colada_nombre?: string | null;
  fabricante_id?: number | null;
  fabricante_nombre?: string | null;
}

export interface ActualizarColadaBobinasCortadasResponse {
  success: boolean;
  filasActualizadas: number;
  coladaId: number;
}

/**
 * Actualiza el campo colada_id en la tabla Bobinas_Cortadas para una lista de IDs.
 * Si colada_id no se proporciona, crea primero el registro en Bobina_Coladas.
 * Si tampoco se proporciona fabricante_id pero sí su nombre, crea el registro en Fabricantes.
 */
export async function actualizarColadaBobinasCortadasService(
  pool: ConnectionPool,
  params: ActualizarColadaBobinasCortadasParams
): Promise<ActualizarColadaBobinasCortadasResponse> {
  const { ids, colada_nombre, fabricante_nombre } = params;
  let { colada_id, fabricante_id } = params;

  if (!ids || ids.length === 0) {
    throw new Error("Debe proporcionar al menos un ID de Bobina Cortada.");
  }

  // Iniciamos una transacción para mantener la consistencia en BD
  const transaction = new Transaction(pool);
  await transaction.begin();

  try {
    // 1. Resolver el fabricante_id si no viene definido
    if (!colada_id && !fabricante_id) {
      if (fabricante_nombre && fabricante_nombre.trim() !== "") {
        const reqFabricante = new Request(transaction);
        reqFabricante.input("nombre", fabricante_nombre.trim());

        // Comprobamos si ya existe el fabricante o lo insertamos
        const resFabricante = await reqFabricante.query(`
          IF EXISTS (SELECT 1 FROM Fabricantes WHERE nombre = @nombre)
          BEGIN
            SELECT id FROM Fabricantes WHERE nombre = @nombre;
          END
          ELSE
          BEGIN
            INSERT INTO Fabricantes (nombre)
            OUTPUT INSERTED.id
            VALUES (@nombre);
          END
        `);

        fabricante_id = resFabricante.recordset[0]?.id;
      } else {
        throw new Error(
          "No se puede crear la colada sin un fabricante_id o fabricante_nombre válido."
        );
      }
    }

    // 2. Crear la colada si colada_id no viene definido
    if (!colada_id) {
      if (!colada_nombre || colada_nombre.trim() === "") {
        throw new Error(
          "Debe proporcionar colada_nombre si colada_id no está definido."
        );
      }

      const reqColada = new Request(transaction);
      reqColada.input("fabricante_id", fabricante_id);
      reqColada.input("colada", colada_nombre.trim());

      const resColada = await reqColada.query(`
        INSERT INTO Bobina_Coladas (fabricante_id, colada)
        OUTPUT INSERTED.id
        VALUES (@fabricante_id, @colada);
      `);

      colada_id = resColada.recordset[0]?.id;
    }

    // 3. Actualizar la tabla Bobinas_Cortadas para los IDs indicados
    const reqUpdate = new Request(transaction);
    reqUpdate.input("colada_id", colada_id);

    // Para evitar problemas de límites de parámetros SQL pasamos la lista mediante un array o IN dinámico
    const paramsList: string[] = [];
    ids.forEach((id, index) => {
      const paramName = `id_${index}`;
      paramsList.push(`@${paramName}`);
      reqUpdate.input(paramName, id);
    });

    const updateQuery = `
      UPDATE Bobinas_Cortadas
      SET colada_id = @colada_id
      WHERE id IN (${paramsList.join(", ")});
    `;

    const result = await reqUpdate.query(updateQuery);

    // Confirmamos los cambios
    await transaction.commit();

    return {
      success: true,
      filasActualizadas: result.rowsAffected[0] || 0,
      coladaId: colada_id!,
    };
  } catch (error) {
    // Si algo falla desglosamos los cambios
    await transaction.rollback();
    throw error;
  }
}
