// lib/services/planes-corte.service.ts
import { BobinaCortada, PlanCorteCabecera } from "@/types/planCorte";
import { Transaction } from "mssql";
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
      request.input("fechaInicio", `${fechaInicio} 00:00:00.000`);
    }
    if (fechaFin) {
      whereClauses.push(`creado < @fechaFin`);
      request.input("fechaFin", `${fechaFin} 23:59:59.999`);
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

export interface ListarFiltrosPlanesCorteParams {
  busqueda?: string;
  ancho_estipulado?: number | null;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarFiltrosPlanesCorteResponse {
  anchos: number[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

/**
 * Servicio dinámico cruzado para obtener los filtros disponibles en Planes de Corte
 */
export async function listarFiltrosPlanesCorteService(
  pool: ConnectionPool,
  params: ListarFiltrosPlanesCorteParams,
): Promise<ListarFiltrosPlanesCorteResponse> {
  const { ancho_estipulado, fechaInicio, fechaFin } = params;

  const reqAnchos = pool.request();
  const reqFechas = pool.request();

  // --- 1. CONSULTA PARA ANCHOS ESTIPULADOS POSIBLES ---
  // Filtra por búsqueda y fechas (IGNORA su propio filtro: ancho_estipulado)
  let whereAnchos = "WHERE 1=1 AND ancho_estipulado IS NOT NULL";

  if (fechaInicio) {
    whereAnchos += " AND creado >= @fechaInicio";
    reqAnchos.input("fechaInicio", fechaInicio);
  }
  if (fechaFin) {
    whereAnchos += " AND creado <= @fechaFin";
    reqAnchos.input("fechaFin", fechaFin);
  }

  const qAnchos = `
    SELECT DISTINCT ancho_estipulado
    FROM Planes_Corte
    ${whereAnchos}
    ORDER BY ancho_estipulado ASC;
  `;

  let whereFechas = "WHERE 1=1";

  if (
    ancho_estipulado !== undefined &&
    ancho_estipulado !== null &&
    ancho_estipulado !== 0
  ) {
    whereFechas += " AND ancho_estipulado = @ancho_estipulado";
    reqFechas.input("ancho_estipulado", ancho_estipulado);
  }

  const qFechas = `
    SELECT 
      MIN(creado) AS minFecha, 
      MAX(creado) AS maxFecha
    FROM Planes_Corte
    ${whereFechas};
  `;

  // Ejecutamos ambas consultas en paralelo
  const [resAnchos, resFechas] = await Promise.all([
    reqAnchos.query(qAnchos),
    reqFechas.query(qFechas),
  ]);

  return {
    anchos: resAnchos.recordset.map((row) => Number(row.ancho_estipulado)),
    rangoFechas: {
      minFecha: resFechas.recordset[0]?.minFecha || null,
      maxFecha: resFechas.recordset[0]?.maxFecha || null,
    },
  };
}

// --- Interfaces para la creación ---

export interface FlejePlanCorteInput {
  fleje_id: number;
  num_flejes: number;
  peso_unit_definido: number;
  factor_proporcional_peso: number;
  orden: number;
}

export interface CrearPlanCorteInput {
  ancho_estipulado: number;
  flejes: FlejePlanCorteInput[];
}

export interface CrearPlanCorteResponse {
  id: number;
  ancho_estipulado: number;
  creado: Date;
  flejesInsertados: number;
}

/**
 * Servicio para crear un nuevo Plan de Corte e insertar sus flejes asociados
 * Utiliza una transacción para garantizar consistencia atómica.
 */
export async function crearPlanCorteService(
  pool: ConnectionPool,
  data: CrearPlanCorteInput,
): Promise<CrearPlanCorteResponse> {
  const { ancho_estipulado, flejes } = data;

  if (!flejes || flejes.length === 0) {
    throw new Error("El plan de corte debe incluir al menos un fleje.");
  }

  // 1. Iniciar la transacción
  const transaction = new Transaction(pool);
  await transaction.begin();

  try {
    // 2. Insertar el registro principal en Planes_Corte y obtener el ID generado
    const reqPlan = transaction.request();
    reqPlan.input("ancho_estipulado", ancho_estipulado);

    const queryPlan = `
      INSERT INTO Planes_Corte (ancho_estipulado, creado)
      OUTPUT INSERTED.id, INSERTED.ancho_estipulado, INSERTED.creado
      VALUES (@ancho_estipulado, GETDATE());
    `;

    const resPlan = await reqPlan.query(queryPlan);
    const planCreado = resPlan.recordset[0];
    const planCorteId: number = planCreado.id;

    // 3. Insertar los flejes asociados dentro de la misma transacción
    for (const fleje of flejes) {
      const reqFleje = transaction.request();
      reqFleje.input("plan_corte_id", planCorteId);
      reqFleje.input("fleje_id", fleje.fleje_id);
      reqFleje.input("num_flejes", fleje.num_flejes);
      reqFleje.input("orden", fleje.orden);
      reqFleje.input("peso_unit_definido", fleje.peso_unit_definido);
      reqFleje.input(
        "factor_proporcional_peso",
        fleje.factor_proporcional_peso,
      );

      const queryFleje = `
        INSERT INTO Flejes_Plan_Corte (
          plan_corte_id, 
          fleje_id, 
          num_flejes, 
          peso_unit_definido, 
          orden,
          creado, 
          factor_proporcional_peso
        )
        VALUES (
          @plan_corte_id, 
          @fleje_id, 
          @num_flejes,
          @orden,
          @peso_unit_definido, 
          GETDATE(), 
          @factor_proporcional_peso
        );
      `;

      await reqFleje.query(queryFleje);
    }

    // 4. Confirmar los cambios
    await transaction.commit();

    return {
      id: planCorteId,
      ancho_estipulado: Number(planCreado.ancho_estipulado),
      creado: planCreado.creado,
      flejesInsertados: flejes.length,
    };
  } catch (error) {
    // Si algo falla, revertimos todos los cambios
    await transaction.rollback();
    throw error;
  }
}

export interface FlejePlanCorteDetalle {
  id: number;
  plan_corte_id: number;
  fleje_id: number;
  num_flejes: number;
  peso_unit_definido: number;
  factor_proporcional_peso: number;
  orden: number;
  // Campos complementarios opcionales del fleje para renderizar en UI
  concepto?: string;
  ancho?: number;
  espesor?: number;
}

export interface PlanCorteDetalleResponse {
  id: number;
  ancho_estipulado: number;
  calidad_id: number;
  creado: Date;
  flejes: FlejePlanCorteDetalle[];
}

/**
 * Servicio para obtener la información detallada de un Plan de Corte
 * junto con la lista de sus flejes asociados ordenados por posición.
 */
export async function obtenerPlanCorteDetalleService(
  pool: ConnectionPool,
  planCorteId: number,
): Promise<PlanCorteDetalleResponse | null> {
  const request = pool.request();
  request.input("planCorteId", planCorteId);

  // Consulta que obtiene el plan principal y hace JOIN con los flejes y sus catálogos
  const query = `
    SELECT 
      pc.id AS plan_id,
      pc.ancho_estipulado,
      pc.creado,
      fpc.id AS fpc_id,
      fpc.fleje_id,
      fpc.num_flejes,
      fpc.peso_unit_definido,
      fpc.factor_proporcional_peso,
      fpc.orden,
      f.concepto,
      f.ancho,
      f.espesor,
      f.calidad_id
    FROM Planes_Corte pc
    LEFT JOIN Flejes_Plan_Corte fpc ON pc.id = fpc.plan_corte_id
    LEFT JOIN Flejes f ON fpc.fleje_id = f.id
    WHERE pc.id = @planCorteId
    ORDER BY fpc.orden ASC;
  `;

  const result = await request.query(query);

  // Si no se encuentra el plan de corte
  if (result.recordset.length === 0) {
    return null;
  }

  const primerRegistro = result.recordset[0];

  // Mapeamos los flejes (controlando si el plan no tiene ninguno aún registrado)
  const flejes: FlejePlanCorteDetalle[] = result.recordset
    .filter((row) => row.fpc_id !== null)
    .map((row) => ({
      id: Number(row.fpc_id),
      plan_corte_id: Number(row.plan_id),
      fleje_id: Number(row.fleje_id),
      num_flejes: Number(row.num_flejes),
      peso_unit_definido: Number(row.peso_unit_definido),
      factor_proporcional_peso: Number(row.factor_proporcional_peso),
      orden: Number(row.orden),
      concepto: row.concepto ?? "",
      ancho: row.ancho ? Number(row.ancho) : undefined,
      espesor: row.espesor ? Number(row.espesor) : undefined,
      calidad_id: row.calidad_id ? Number(row.calidad_id) : undefined,
    }));

  return {
    id: Number(primerRegistro.plan_id),
    ancho_estipulado: Number(primerRegistro.ancho_estipulado),
    calidad_id: Number(primerRegistro.calidad_id),
    creado: primerRegistro.creado,
    flejes,
  };
}

export interface FlejePlanCorteInput {
  fleje_id: number;
  num_flejes: number;
  peso_unit_definido: number;
  factor_proporcional_peso: number;
  orden: number;
}

export interface ActualizarPlanCorteInput {
  id: number;
  ancho_estipulado: number;
  calidad_id: number;
  flejes: FlejePlanCorteInput[];
}

export interface ActualizarPlanCorteResponse {
  id: number;
  ancho_estipulado: number;
  calidad_id: number;
  flejesActualizados: number;
}

/**
 * Servicio para actualizar un Plan de Corte existente y reemplazar sus flejes asociados.
 * Utiliza una transacción para garantizar atomicidad en la actualización y reemplazo.
 */
export async function actualizarPlanCorteService(
  pool: ConnectionPool,
  data: ActualizarPlanCorteInput,
): Promise<ActualizarPlanCorteResponse> {
  const { id, ancho_estipulado, calidad_id, flejes } = data;

  if (!flejes || flejes.length === 0) {
    throw new Error("El plan de corte debe incluir al menos un fleje.");
  }

  // 1. Iniciar la transacción
  const transaction = new Transaction(pool);
  await transaction.begin();

  try {
    // 2. Actualizar el registro cabecera en Planes_Corte
    const reqPlan = transaction.request();
    reqPlan.input("id", id);
    reqPlan.input("ancho_estipulado", ancho_estipulado);

    const queryPlan = `
      UPDATE Planes_Corte
      SET 
        ancho_estipulado = @ancho_estipulado
      WHERE id = @id;
    `;

    const resPlan = await reqPlan.query(queryPlan);

    // Si no afectó filas, significa que el Plan de Corte con ese ID no existe
    if (resPlan.rowsAffected[0] === 0) {
      throw new Error(`El Plan de Corte con ID ${id} no existe.`);
    }

    // 3. Eliminar los flejes anteriores vinculados a este plan
    const reqDeleteFlejes = transaction.request();
    reqDeleteFlejes.input("plan_corte_id", id);

    await reqDeleteFlejes.query(`
      DELETE FROM Flejes_Plan_Corte
      WHERE plan_corte_id = @plan_corte_id;
    `);

    // 4. Insertar la nueva lista de flejes actualizada
    for (const fleje of flejes) {
      const reqFleje = transaction.request();
      reqFleje.input("plan_corte_id", id);
      reqFleje.input("fleje_id", fleje.fleje_id);
      reqFleje.input("num_flejes", fleje.num_flejes);
      reqFleje.input("orden", fleje.orden);
      reqFleje.input("peso_unit_definido", fleje.peso_unit_definido);
      reqFleje.input(
        "factor_proporcional_peso",
        fleje.factor_proporcional_peso,
      );

      const queryFleje = `
        INSERT INTO Flejes_Plan_Corte (
          plan_corte_id, 
          fleje_id, 
          num_flejes, 
          peso_unit_definido, 
          orden,
          creado, 
          factor_proporcional_peso
        )
        VALUES (
          @plan_corte_id, 
          @fleje_id, 
          @num_flejes, 
          @peso_unit_definido, 
          @orden,
          GETDATE(), 
          @factor_proporcional_peso
        );
      `;

      await reqFleje.query(queryFleje);
    }

    // 5. Confirmar la transacción
    await transaction.commit();

    return {
      id,
      ancho_estipulado: Number(ancho_estipulado),
      calidad_id: Number(calidad_id),
      flejesActualizados: flejes.length,
    };
  } catch (error) {
    // Si algo falla, se revierten la actualización y los cambios en los flejes
    await transaction.rollback();
    throw error;
  }
}

export interface EliminarPlanCorteResponse {
  id: number;
  flejesEliminados: number;
  message: string;
}

/**
 * Servicio para eliminar un Plan de Corte y todos sus flejes asociados.
 * Utiliza una transacción para garantizar que no queden registros huérfanos.
 */
export async function eliminarPlanCorteService(
  pool: ConnectionPool,
  id: number,
): Promise<EliminarPlanCorteResponse> {
  if (!id || typeof id !== "number") {
    throw new Error("Se debe proporcionar un ID de plan de corte válido.");
  }

  // 1. Iniciar la transacción
  const transaction = new Transaction(pool);
  await transaction.begin();

  try {
    // 2. Eliminar primero los flejes asociados (hijos)
    const reqDeleteFlejes = transaction.request();
    reqDeleteFlejes.input("plan_corte_id", id);

    const resFlejes = await reqDeleteFlejes.query(`
      DELETE FROM Flejes_Plan_Corte
      WHERE plan_corte_id = @plan_corte_id;
    `);

    // 3. Eliminar la cabecera del plan de corte (padre)
    const reqDeletePlan = transaction.request();
    reqDeletePlan.input("id", id);

    const resPlan = await reqDeletePlan.query(`
      DELETE FROM Planes_Corte
      WHERE id = @id;
    `);

    // Si no se afectó ninguna fila en la cabecera, el registro no existía
    if (resPlan.rowsAffected[0] === 0) {
      throw new Error(`El Plan de Corte con ID ${id} no existe.`);
    }

    // 4. Confirmar la transacción
    await transaction.commit();

    const flejesEliminados = resFlejes.rowsAffected[0] || 0;

    return {
      id,
      flejesEliminados,
      message: `Plan de corte ${id} y sus ${flejesEliminados} flejes asociados fueron eliminados correctamente.`,
    };
  } catch (error) {
    // Si falla la eliminación del padre o del hijo, revertimos los cambios
    await transaction.rollback();
    throw error;
  }
}

export async function getBobinasPorPlanCorte(
  pool: ConnectionPool,
  planCorteId: number,
): Promise<{ cabecera: PlanCorteCabecera | null; bobinas: BobinaCortada[] }> {
  const req = pool.request();
  req.input("planCorteId", planCorteId);

  // 1. Cabecera del plan
  const resCabecera = await req.query(`
    SELECT id, codigo_plan AS codigoPlan, fecha_creacion AS fechaCreacion, estado
    FROM Planes_Corte
    WHERE id = @planCorteId;
  `);

  if (resCabecera.recordset.length === 0) {
    return { cabecera: null, bobinas: [] };
  }

  // 2. Consulta exacta sobre la tabla Bobinas_Cortadas
  // Nota: Si tienes tabla de Usuarios/Operarios, puedes hacer LEFT JOIN con Operarios o Usuarios
  const resBobinas = await req.query(`
    SELECT 
      bc.id,
      bc.bobina_id AS bobinaId,
      bc.plan_corte_id AS planCorteId,
      bc.numero,
      bc.ancho_inicial AS anchoInicial,
      bc.ancho_final AS anchoFinal,
      bc.espesor_inicial AS espesorInicial,
      bc.espesor_final AS espesorFinal,
      bc.peso_real AS pesoReal,
      bc.observacion,
      bc.creado,
      bc.colada_id AS coladaId,
      CONCAT('Op. #', bc.operario_id) AS operario -- O el campo nombre si haces JOIN con Usuarios
    FROM Bobinas_Cortadas bc
    WHERE bc.plan_corte_id = @planCorteId
    ORDER BY bc.creado DESC, bc.id DESC;
  `);

  const cabecera: PlanCorteCabecera = {
    ...resCabecera.recordset[0],
    totalBobinas: resBobinas.recordset.length,
  };

  return {
    cabecera,
    bobinas: resBobinas.recordset,
  };
}
