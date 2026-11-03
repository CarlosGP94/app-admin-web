import { ConnectionPool, Request, Transaction } from "mssql";

export interface FiltrosMallas {
  buscar?: string;
}

export interface ListarMallasParams {
  page?: number;
  pageSize?: number;
  orderBy?:
    | "ancho"
    | "largo"
    | "longitudinales"
    | "transversales"
    | "sl"
    | "st";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosMallas;
}

export interface MallaRow {
  id: number;
  codigo: string;
  art_concepto: string;
  art_codigo: string;
  designacion: string;
  activo: boolean;
  longitudinales: number;
  transversales: number;
  peso_por_paquete: number;
  unidades_por_paquete: number;
  sl: number;
  st: number;
  region_id: number;
  action_id: number;
  creado: string;
}

export interface ListarMallasResponse {
  data: MallaRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar los Mallas
 */
export async function listarMallasService(
  pool: ConnectionPool,
  params: ListarMallasParams
): Promise<ListarMallasResponse> {
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

  if (filtros?.buscar) {
    whereClauses += " AND t.art_concepto LIKE @buscar";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  // 2. Determinar el orden seguro para inyectar en ROW_NUMBER()
  let safeOrderBySql = "";

  if (orderBy) {
    const columnasPermitidas = {
      art_concepto: "m.art_concepto",
      art_codigo: "m.art_codigo",
      codigo: "m.codigo",
      sl: "m.sl",
      st: "m.st",
      longitudinales: "m.longitudinales",
      transversales: "m.transversales",
      ancho: "m.ancho",
      largo: "m.largo",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    // Si hay filtros aplicados pero no un orden explícito, priorizamos agrupaciones naturales
    const tieneFiltros = filtros?.buscar;
    if (tieneFiltros) {
      safeOrderBySql = "m.diametro ASC, m.largo ASC, m.id ASC";
    } else {
      safeOrderBySql = "m.id DESC"; // Orden por defecto estándar
    }
  }

  // 3. Query paginada con CTE compatible con SQL 2008
  const query = `
    WITH MallasPaginados AS (
        SELECT
            m.id,
            m.art_concepto,
            m.art_codigo,
            m.codigo,
            m.designacion,
            m.activo,
            m.unidades_por_paquete,
            m.peso_por_paquete,
            m.transversales,
            m.longitudinales,
            m.sl,
            m.st,
            m.ancho,
            m.largo,
            m.diametro,
            m.creado AS fecha,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Mallas_DB_Mallas m
        ${whereClauses}
    )
    SELECT *
    FROM MallasPaginados
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
      art_codigo: row.art_codigo,
      codigo: row.codigo,
      designacion: row.designacion,
      activo: row.activo,
      largo: row.largo,
      ancho: row.ancho,
      diametro: row.diametro,
      sl: row.sl,
      st: row.st,
      longitudinales: row.longitudinales,
      transversales: row.transversales,
      unidades_por_paquete: row.unidades_por_paquete,
      peso_por_paquete: row.peso_por_paquete,
      region_id: row.region_id,
      creado: row.fecha ? new Date(row.fecha).toISOString() : "",
    })),
    total,
    page,
    pageSize,
  };
}

export interface FiltrosMallasParams {
  filtros?: {
    busqueda?: string;
    calidadId?: number;
    tipoId?: number;
    espesor?: number;
  };
}

export interface ListarFiltrosMallasResponse {
  calidades: Array<{ id: number; nombre: string }>;
  tipos: Array<{ id: number; nombre: string }>;
  espesores: number[];
}

/**
 * Servicio para obtener selectores dinámicos y dependientes cruzados de los Mallas
 */
export async function listarFiltrosMallasService(
  pool: ConnectionPool,
  params: FiltrosMallasParams
): Promise<ListarFiltrosMallasResponse> {
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
    FROM Mallas_DB_Mallas t
    INNER JOIN Mallas_DB_Tipos_Calidad tc ON t.calidad_id = tc.id
    ${whereCalidades}
    ORDER BY tc.nombre ASC;
  `;

  // --- QUERY 2: TIPOS ---
  const whereTipos = "WHERE 1=1" + aplicarFiltrosComunes(reqTipos, "tipo");
  const qTipos = `
    SELECT DISTINCT tt.id, tt.nombre as tipo
    FROM Mallas_DB_Mallas t
    INNER JOIN Mallas_DB_Tipos_Mallas tt ON t.tipo_id = tt.id
    ${whereTipos}
    ORDER BY tt.nombre ASC;
  `;

  // --- QUERY 3: ESPESORES ---
  const whereEspesores =
    "WHERE 1=1" + aplicarFiltrosComunes(reqEspesores, "espesor");
  const qEspesores = `
    SELECT DISTINCT t.espesor
    FROM Mallas_DB_Mallas t
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
export interface MallaCreatePayload {
  codigo: string;
  art_concepto: string;
  art_codigo: string;
  designacion: string;
  activo: boolean;
  diametro: number;
  largo: number;
  ancho: number;
  longitudinales: number;
  transversales: number;
  peso_por_paquete: number;
  unidades_por_paquete: number;
  sl: number;
  st: number;
  region_id: number;
}

export interface MallaCreateResponse {
  id: number;
  art_concepto: string;
  codigo: string;
}

/**
 * Servicio para crear un nuevo Malla y registrar la configuración de sus máquinas/flejes asociadas.
 */
export async function crearMallaService(
  pool: ConnectionPool,
  payload: MallaCreatePayload
): Promise<MallaCreateResponse> {
  // 1. Transformación de campos según la lógica de negocio

  const artConceptoInsertar = `${payload.art_concepto.trim()}`;
  const designacionInsertar = `${payload.designacion.trim()}`;

  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 2. Inserción de la cabecera en la tabla Mallas
    const reqMalla = new Request(transaction);

    reqMalla.input("activo", payload.activo);
    reqMalla.input("art_concepto", artConceptoInsertar);
    reqMalla.input("codigo", payload.codigo);
    reqMalla.input("art_codigo", payload.art_codigo);
    reqMalla.input("designacion", designacionInsertar);
    reqMalla.input("diametro", payload.diametro);
    reqMalla.input("largo", payload.largo);
    reqMalla.input("ancho", payload.ancho);
    reqMalla.input("sl", payload.sl);
    reqMalla.input("st", payload.st);
    reqMalla.input("transversales", payload.transversales);
    reqMalla.input("longitudinales", payload.longitudinales);
    reqMalla.input("unidades_por_paquete", payload.unidades_por_paquete);
    reqMalla.input("peso_por_paquete", payload.peso_por_paquete);
    reqMalla.input("region_id", payload.region_id);

    const queryInsertMalla = `
      INSERT INTO Mallas_DB_Mallas (
        activo, art_concepto, codigo, art_codigo, designacion, diametro,
        largo, ancho, sl, st, transversales, region_id,
        longitudinales, unidades_por_paquete, peso_por_paquete,
        creado
      )
      OUTPUT INSERTED.id
      VALUES (
        @activo, @art_concepto, @codigo, @art_codigo, @designacion, @diametro,
        @largo, @ancho, @sl, @st, @transversales, @region_id,
        @longitudinales, @unidades_por_paquete, @peso_por_paquete,
        GETDATE()
      );
    `;

    const resMalla = await reqMalla.query(queryInsertMalla);
    const nuevoMallaId = resMalla.recordset[0].id;

    // 4. Confirmar transacción
    await transaction.commit();

    return {
      id: nuevoMallaId,
      art_concepto: artConceptoInsertar,
      codigo: payload.codigo,
    };
  } catch (error) {
    // Si algo falla, revertimos cualquier cambio en la BD
    await transaction.rollback();
    throw error;
  }
}

export interface MallaUpdatePayload extends MallaCreatePayload {
  id: number;
}

export interface MallaUpdateResponse {
  id: number;
  art_concepto: string;
  codigo: string;
}

export async function actualizarMallaService(
  pool: ConnectionPool,
  payload: MallaUpdatePayload
): Promise<MallaUpdateResponse> {
  // 1. Transformación de campos según la lógica de negocio
  const artConceptoInsertar = `${payload.art_concepto.trim()}`;
  const designacionInsertar = `${payload.designacion.trim()}`;

  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 2. Actualización de la cabecera en la tabla Mallas
    const reqMalla = new Request(transaction);
    reqMalla.input("activo", payload.activo);
    reqMalla.input("art_concepto", artConceptoInsertar);
    reqMalla.input("codigo", payload.codigo);
    reqMalla.input("art_codigo", payload.art_codigo);
    reqMalla.input("designacion", designacionInsertar);
    reqMalla.input("diametro", payload.diametro);
    reqMalla.input("largo", payload.largo);
    reqMalla.input("ancho", payload.ancho);
    reqMalla.input("sl", payload.sl);
    reqMalla.input("st", payload.st);
    reqMalla.input("transversales", payload.transversales);
    reqMalla.input("longitudinales", payload.longitudinales);
    reqMalla.input("unidades_por_paquete", payload.unidades_por_paquete);
    reqMalla.input("peso_por_paquete", payload.peso_por_paquete);
    reqMalla.input("region_id", payload.region_id);

    const queryUpdateMalla = `
      UPDATE Mallas_DB_Mallas
      SET 
        activo = @activo,
        art_concepto = @art_concepto,
        codigo = @codigo,
        art_codigo = @art_codigo,
        designacion = @designacion,
        diametro = @diametro,
        largo = @largo,
        ancho = @ancho,
        sl = @sl,
        st = @st,
        transversales = @transversales,
        longitudinales = @longitudinales,
        unidades_por_paquete = @unidades_por_paquete,
        peso_por_paquete = @peso_por_paquete,
        region_id = @region_id
      WHERE id = @id;
    `;

    await reqMalla.query(queryUpdateMalla);

    // 5. Confirmar la transacción
    await transaction.commit();

    return {
      id: payload.id,
      art_concepto: artConceptoInsertar,
      codigo: payload.codigo,
    };
  } catch (error) {
    // Si ocurre un error, revertimos todos los cambios
    await transaction.rollback();
    throw error;
  }
}

// Detalle del tubo
export interface MallaDetalleResponse {
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
}

/**
 * Servicio para obtener un tubo por su ID con sus configuraciones de máquinas/flejes agrupadas.
 */
export async function obtenerMallaPorIdService(
  pool: ConnectionPool,
  id: number
): Promise<MallaDetalleResponse | null> {
  const reqMalla = pool.request();
  reqMalla.input("id", id);

  // 1. Consultar la cabecera del Malla
  const queryMalla = `
    SELECT 
      id, calidad_id, tipo_id, activo, art_concepto, medida,
      alto, ancho, diametro, espesor, longitud,
      num_paquetes, num_por_paq, unidades, peso_unitario,
      peso_total, alto_paq, ancho_paq
    FROM Mallas_DB_Mallas
    WHERE id = @id;
  `;

  const resMalla = await reqMalla.query(queryMalla);
  if (resMalla.recordset.length === 0) {
    return null;
  }

  const tuboRow = resMalla.recordset[0];

  // 2. Consultar las máquinas y flejes asociados
  const reqMaquinas = pool.request();
  reqMaquinas.input("tubo_id", id);

  const queryMaquinas = `
    SELECT 
      tm.maquina_id,
      m.nombre AS maquina_nombre,
      tm.fleje_id
    FROM Mallas_DB_Rel_Mallas_Maquinas tm
    INNER JOIN Maquinas m ON tm.maquina_id = m.id
    WHERE tm.tubo_id = @tubo_id;
  `;

  const resMaquinas = await reqMaquinas.query(queryMaquinas);

  const artConceptoLimpio = tuboRow.art_concepto.replace(/^Malla\s+/i, "");

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
  };
}

// Interfaces para Eliminar Malla
export interface MallaDeleteResponse {
  id: number;
  eliminado: boolean;
  relacionesEliminadas: number;
}

/**
 * Servicio para eliminar un Malla y sus configuraciones asociadas en Mallas_Maquinas.
 */
export async function eliminarMallaService(
  pool: ConnectionPool,
  id: number
): Promise<MallaDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 1. Eliminar relaciones asociadas en Mallas_Maquinas
    const reqDeleteRelaciones = new Request(transaction);
    reqDeleteRelaciones.input("tubo_id", id);

    const queryDeleteRelaciones = `
      DELETE FROM Mallas_DB_Rel_Mallas_Maquinas 
      WHERE tubo_id = @tubo_id;
    `;

    const resRelaciones = await reqDeleteRelaciones.query(
      queryDeleteRelaciones
    );
    const relacionesEliminadas = resRelaciones.rowsAffected[0] || 0;

    // 2. Eliminar el registro principal en la tabla Mallas
    const reqDeleteMalla = new Request(transaction);
    reqDeleteMalla.input("id", id);

    const queryDeleteMalla = `
      DELETE FROM Mallas_DB_Mallas 
      WHERE id = @id;
    `;

    const resMalla = await reqDeleteMalla.query(queryDeleteMalla);
    const tuboEliminado = (resMalla.rowsAffected[0] || 0) > 0;

    // Si el registro no existía en la tabla Mallas, revertimos cambios por seguridad
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

export interface MallaSelectorOption {
  id: number;
  medida: string;
}

export async function listarMallasSelectorService(
  pool: ConnectionPool,
  calidadId?: number | null,
  tipoMallaId?: number | null,
  maquinaId?: number | null
): Promise<MallaSelectorOption[]> {
  const req = pool.request();

  let whereClause = "WHERE t.activo = 1";

  if (calidadId !== undefined && calidadId !== null) {
    req.input("calidadId", calidadId);
    whereClause += " AND t.calidad_id = @calidadId";
  }

  if (tipoMallaId !== undefined && tipoMallaId !== null) {
    req.input("tipoMallaId", tipoMallaId);
    whereClause += " AND t.tipo_id = @tipoMallaId";
  }

  if (maquinaId !== undefined && maquinaId !== null) {
    req.input("maquinaId", maquinaId);
    whereClause +=
      " AND EXISTS (SELECT 1 FROM Mallas_DB_Rel_Mallas_Maquinas tm WHERE tm.tubo_id = t.id AND tm.maquina_id = @maquinaId)";
  }

  const query = `
    SELECT 
        t.id,
        t.medida
    FROM Mallas_DB_Mallas t
    INNER JOIN Mallas_DB_Tipos_Calidad tc ON t.calidad_id = tc.id
    INNER JOIN Mallas_DB_Tipos_Mallas tt ON t.tipo_id = tt.id
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
