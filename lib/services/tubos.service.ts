import { ConnectionPool, Request, Transaction } from "mssql";

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

// Crear tubo

export interface MaquinaConfigPayload {
  maquina_id: number;
  maquina_nombre: string;
  habilitada: boolean;
  flejes_ids: number[];
}

export interface TuboCreatePayload {
  calidad_id: number;
  tipo_id: number;
  activo: boolean;
  art_concepto: string;
  alto: number;
  ancho: number;
  diametro: number;
  espesor: number;
  longitud: number;
  num_paquetes: number;
  num_por_paq: number;
  unidades: number;
  peso_unitario: number;
  peso_total: number;
  alto_paq: number;
  ancho_paq: number;
  maquinasConfig: MaquinaConfigPayload[];
}

export interface TuboCreateResponse {
  id: number;
  art_concepto: string;
  medida: string;
  relacionesCreadas: number;
}

/**
 * Servicio para crear un nuevo Tubo y registrar la configuración de sus máquinas/flejes asociadas.
 */
export async function crearTuboService(
  pool: ConnectionPool,
  payload: TuboCreatePayload,
): Promise<TuboCreateResponse> {
  // 1. Transformación de campos según la lógica de negocio
  const medidaInsertar = payload.art_concepto.trim();
  const artConceptoInsertar = `Tubo ${medidaInsertar}`;

  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 2. Inserción de la cabecera en la tabla Tubos
    const reqTubo = new Request(transaction);
    reqTubo.input("calidad_id", payload.calidad_id);
    reqTubo.input("tipo_id", payload.tipo_id);
    reqTubo.input("activo", payload.activo);
    reqTubo.input("art_concepto", artConceptoInsertar);
    reqTubo.input("medida", medidaInsertar);
    reqTubo.input("alto", payload.alto);
    reqTubo.input("ancho", payload.ancho);
    reqTubo.input("diametro", payload.diametro);
    reqTubo.input("espesor", payload.espesor);
    reqTubo.input("longitud", payload.longitud);
    reqTubo.input("num_paquetes", payload.num_paquetes);
    reqTubo.input("num_por_paq", payload.num_por_paq);
    reqTubo.input("unidades", payload.unidades);
    reqTubo.input("peso_unitario", payload.peso_unitario);
    reqTubo.input("peso_total", payload.peso_total);
    reqTubo.input("alto_paq", payload.alto_paq);
    reqTubo.input("ancho_paq", payload.ancho_paq);

    const queryInsertTubo = `
      INSERT INTO Tubos (
        calidad_id, tipo_id, activo, art_concepto, medida,
        alto, ancho, diametro, espesor, longitud,
        num_paquetes, num_por_paq, unidades, peso_unitario,
        peso_total, alto_paq, ancho_paq, creado
      )
      OUTPUT INSERTED.id
      VALUES (
        @calidad_id, @tipo_id, @activo, @art_concepto, @medida,
        @alto, @ancho, @diametro, @espesor, @longitud,
        @num_paquetes, @num_por_paq, @unidades, @peso_unitario,
        @peso_total, @alto_paq, @ancho_paq, GETDATE()
      );
    `;

    const resTubo = await reqTubo.query(queryInsertTubo);
    const nuevoTuboId = resTubo.recordset[0].id;

    // 3. Procesar las configuraciones de máquinas y flejes (Tubos_Maquinas)
    let totalRelaciones = 0;

    for (const config of payload.maquinasConfig) {
      // Si la máquina está habilitada y tiene IDs de flejes
      if (
        config.habilitada &&
        config.flejes_ids &&
        config.flejes_ids.length > 0
      ) {
        for (const flejeId of config.flejes_ids) {
          const reqMaquina = new Request(transaction);
          reqMaquina.input("tubo_id", nuevoTuboId);
          reqMaquina.input("maquina_id", config.maquina_id);
          reqMaquina.input("fleje_id", flejeId);

          const queryInsertMaquina = `
            INSERT INTO Tubos_Maquinas (tubo_id, maquina_id, fleje_id, creado)
            VALUES (@tubo_id, @maquina_id, @fleje_id, GETDATE());
          `;

          await reqMaquina.query(queryInsertMaquina);
          totalRelaciones++;
        }
      }
    }

    // 4. Confirmar transacción
    await transaction.commit();

    return {
      id: nuevoTuboId,
      art_concepto: artConceptoInsertar,
      medida: medidaInsertar,
      relacionesCreadas: totalRelaciones,
    };
  } catch (error) {
    // Si algo falla, revertimos cualquier cambio en la BD
    await transaction.rollback();
    throw error;
  }
}

export interface TuboUpdatePayload extends TuboCreatePayload {
  id: number;
}

export interface TuboUpdateResponse {
  id: number;
  art_concepto: string;
  medida: string;
  relacionesActualizadas: number;
}

export async function actualizarTuboService(
  pool: ConnectionPool,
  payload: TuboUpdatePayload,
): Promise<TuboUpdateResponse> {
  // 1. Transformación de campos según la lógica de negocio
  const medidaInsertar = payload.art_concepto.trim();
  const artConceptoInsertar = `Tubo ${medidaInsertar}`;

  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 2. Actualización de la cabecera en la tabla Tubos
    const reqTubo = new Request(transaction);
    reqTubo.input("id", payload.id);
    reqTubo.input("calidad_id", payload.calidad_id);
    reqTubo.input("tipo_id", payload.tipo_id);
    reqTubo.input("activo", payload.activo);
    reqTubo.input("art_concepto", artConceptoInsertar);
    reqTubo.input("medida", medidaInsertar);
    reqTubo.input("alto", payload.alto);
    reqTubo.input("ancho", payload.ancho);
    reqTubo.input("diametro", payload.diametro);
    reqTubo.input("espesor", payload.espesor);
    reqTubo.input("longitud", payload.longitud);
    reqTubo.input("num_paquetes", payload.num_paquetes);
    reqTubo.input("num_por_paq", payload.num_por_paq);
    reqTubo.input("unidades", payload.unidades);
    reqTubo.input("peso_unitario", payload.peso_unitario);
    reqTubo.input("peso_total", payload.peso_total);
    reqTubo.input("alto_paq", payload.alto_paq);
    reqTubo.input("ancho_paq", payload.ancho_paq);

    const queryUpdateTubo = `
      UPDATE Tubos
      SET 
        calidad_id = @calidad_id,
        tipo_id = @tipo_id,
        activo = @activo,
        art_concepto = @art_concepto,
        medida = @medida,
        alto = @alto,
        ancho = @ancho,
        diametro = @diametro,
        espesor = @espesor,
        longitud = @longitud,
        num_paquetes = @num_paquetes,
        num_por_paq = @num_por_paq,
        unidades = @unidades,
        peso_unitario = @peso_unitario,
        peso_total = @peso_total,
        alto_paq = @alto_paq,
        ancho_paq = @ancho_paq
      WHERE id = @id;
    `;

    await reqTubo.query(queryUpdateTubo);

    // 3. Eliminar todas las relaciones anteriores en Tubos_Maquinas para este tubo
    const reqDeleteRelaciones = new Request(transaction);
    reqDeleteRelaciones.input("tubo_id", payload.id);

    const queryDeleteRelaciones = `
      DELETE FROM Tubos_Maquinas 
      WHERE tubo_id = @tubo_id;
    `;

    await reqDeleteRelaciones.query(queryDeleteRelaciones);

    // 4. Volver a reinsertar las configuraciones de máquinas y flejes válidas
    let totalRelaciones = 0;

    for (const config of payload.maquinasConfig) {
      if (
        config.habilitada &&
        config.flejes_ids &&
        config.flejes_ids.length > 0
      ) {
        for (const flejeId of config.flejes_ids) {
          const reqMaquina = new Request(transaction);
          reqMaquina.input("tubo_id", payload.id);
          reqMaquina.input("maquina_id", config.maquina_id);
          reqMaquina.input("fleje_id", flejeId);

          const queryInsertMaquina = `
            INSERT INTO Tubos_Maquinas (tubo_id, maquina_id, fleje_id, creado)
            VALUES (@tubo_id, @maquina_id, @fleje_id, GETDATE());
          `;

          await reqMaquina.query(queryInsertMaquina);
          totalRelaciones++;
        }
      }
    }

    // 5. Confirmar la transacción
    await transaction.commit();

    return {
      id: payload.id,
      art_concepto: artConceptoInsertar,
      medida: medidaInsertar,
      relacionesActualizadas: totalRelaciones,
    };
  } catch (error) {
    // Si ocurre un error, revertimos todos los cambios
    await transaction.rollback();
    throw error;
  }
}

// Detalle del tubo
export interface TuboDetalleResponse {
  id: number;
  calidad_id: number;
  tipo_id: number;
  activo: boolean;
  art_concepto: string;
  alto: number;
  ancho: number;
  diametro: number;
  espesor: number;
  longitud: number;
  num_paquetes: number;
  num_por_paq: number;
  unidades: number;
  peso_unitario: number;
  peso_total: number;
  alto_paq: number;
  ancho_paq: number;
  maquinasConfig: MaquinaConfigPayload[];
}

/**
 * Servicio para obtener un tubo por su ID con sus configuraciones de máquinas/flejes agrupadas.
 */
export async function obtenerTuboPorIdService(
  pool: ConnectionPool,
  id: number,
): Promise<TuboDetalleResponse | null> {
  const reqTubo = pool.request();
  reqTubo.input("id", id);

  // 1. Consultar la cabecera del Tubo
  const queryTubo = `
    SELECT 
      id, calidad_id, tipo_id, activo, art_concepto, medida,
      alto, ancho, diametro, espesor, longitud,
      num_paquetes, num_por_paq, unidades, peso_unitario,
      peso_total, alto_paq, ancho_paq
    FROM Tubos
    WHERE id = @id;
  `;

  const resTubo = await reqTubo.query(queryTubo);
  if (resTubo.recordset.length === 0) {
    return null;
  }

  const tuboRow = resTubo.recordset[0];

  // 2. Consultar las máquinas y flejes asociados
  const reqMaquinas = pool.request();
  reqMaquinas.input("tubo_id", id);

  const queryMaquinas = `
    SELECT 
      tm.maquina_id,
      m.nombre AS maquina_nombre,
      tm.fleje_id
    FROM Tubos_Maquinas tm
    INNER JOIN Maquinas m ON tm.maquina_id = m.id
    WHERE tm.tubo_id = @tubo_id;
  `;

  const resMaquinas = await reqMaquinas.query(queryMaquinas);

  // 3. Agrupar los flejes por máquina para construir maquinasConfig
  const maquinasMap = new Map<number, MaquinaConfigPayload>();

  for (const row of resMaquinas.recordset) {
    if (!maquinasMap.has(row.maquina_id)) {
      maquinasMap.set(row.maquina_id, {
        maquina_id: row.maquina_id,
        maquina_nombre: row.maquina_nombre,
        habilitada: true,
        flejes_ids: [],
      });
    }
    const config = maquinasMap.get(row.maquina_id)!;
    if (row.fleje_id && !config.flejes_ids.includes(row.fleje_id)) {
      config.flejes_ids.push(row.fleje_id);
    }
  }

  const maquinasConfig = Array.from(maquinasMap.values());
  const artConceptoLimpio = tuboRow.art_concepto.replace(/^Tubo\s+/i, "");

  return {
    id: tuboRow.id,
    calidad_id: tuboRow.calidad_id,
    tipo_id: tuboRow.tipo_id,
    activo: tuboRow.activo,
    art_concepto: artConceptoLimpio,
    alto: tuboRow.alto,
    ancho: tuboRow.ancho,
    diametro: tuboRow.diametro,
    espesor: tuboRow.espesor,
    longitud: tuboRow.longitud,
    num_paquetes: tuboRow.num_paquetes,
    num_por_paq: tuboRow.num_por_paq,
    unidades: tuboRow.unidades,
    peso_unitario: tuboRow.peso_unitario,
    peso_total: tuboRow.peso_total,
    alto_paq: tuboRow.alto_paq,
    ancho_paq: tuboRow.ancho_paq,
    maquinasConfig,
  };
}

// Interfaces para Eliminar Tubo
export interface TuboDeleteResponse {
  id: number;
  eliminado: boolean;
  relacionesEliminadas: number;
}

/**
 * Servicio para eliminar un Tubo y sus configuraciones asociadas en Tubos_Maquinas.
 */
export async function eliminarTuboService(
  pool: ConnectionPool,
  id: number,
): Promise<TuboDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 1. Eliminar relaciones asociadas en Tubos_Maquinas
    const reqDeleteRelaciones = new Request(transaction);
    reqDeleteRelaciones.input("tubo_id", id);

    const queryDeleteRelaciones = `
      DELETE FROM Tubos_Maquinas 
      WHERE tubo_id = @tubo_id;
    `;

    const resRelaciones = await reqDeleteRelaciones.query(
      queryDeleteRelaciones,
    );
    const relacionesEliminadas = resRelaciones.rowsAffected[0] || 0;

    // 2. Eliminar el registro principal en la tabla Tubos
    const reqDeleteTubo = new Request(transaction);
    reqDeleteTubo.input("id", id);

    const queryDeleteTubo = `
      DELETE FROM Tubos 
      WHERE id = @id;
    `;

    const resTubo = await reqDeleteTubo.query(queryDeleteTubo);
    const tuboEliminado = (resTubo.rowsAffected[0] || 0) > 0;

    // Si el registro no existía en la tabla Tubos, revertimos cambios por seguridad
    if (!tuboEliminado) {
      await transaction.rollback();
      return {
        id,
        eliminado: false,
        relacionesEliminadas: 0,
      };
    }

    // 3. Confirmar la transacción
    await transaction.commit();

    return {
      id,
      eliminado: true,
      relacionesEliminadas,
    };
  } catch (error) {
    // Revertir ante cualquier fallo de base de datos
    await transaction.rollback();
    throw error;
  }
}

export interface TuboSelectorOption {
  id: number;
  medida: string;
}

export async function listarTubosSelectorService(
  pool: ConnectionPool,
  calidadId?: number | null,
  tipoTuboId?: number | null,
  maquinaId?: number | null,
): Promise<TuboSelectorOption[]> {
  const req = pool.request();

  let whereClause = "WHERE t.activo = 1";

  if (calidadId !== undefined && calidadId !== null) {
    req.input("calidadId", calidadId);
    whereClause += " AND t.calidad_id = @calidadId";
  }

  if (tipoTuboId !== undefined && tipoTuboId !== null) {
    req.input("tipoTuboId", tipoTuboId);
    whereClause += " AND t.tipo_id = @tipoTuboId";
  }

  if (maquinaId !== undefined && maquinaId !== null) {
    req.input("maquinaId", maquinaId);
    whereClause +=
      " AND EXISTS (SELECT 1 FROM Tubos_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
  }

  const query = `
    SELECT 
        t.id,
        t.medida
    FROM Tubos t
    INNER JOIN Tipos_Calidad tc ON t.calidad_id = tc.id
    INNER JOIN Tipos_Tubos tt ON t.tipo_id = tt.id
    ${whereClause}
    ORDER BY 
        tc.nombre ASC,
        t.espesor ASC,
        tt.nombre ASC,
        t.ancho ASC,
        t.alto ASC,
        t.diametro ASC,
        t.id ASC;
  `;

  const resultado = await req.query(query);

  return resultado.recordset.map((row) => ({
    id: row.id,
    medida: row.medida,
  }));
}
