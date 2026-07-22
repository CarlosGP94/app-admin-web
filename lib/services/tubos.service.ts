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
