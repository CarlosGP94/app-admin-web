import {
  ConnectionPool,
  Request,
  Int,
  Decimal,
  VarChar,
  Bit,
  Transaction,
} from "mssql";

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
  calidadId?: number | null,
): Promise<FlejeSelectorOption[]> {
  const req = pool.request();

  let whereClause = "WHERE f.activo = 1";

  if (calidadId !== undefined && calidadId !== null) {
    req.input("calidadId", calidadId);
    whereClause += " AND f.calidad_id = @calidadId";
  }

  const query = `
    SELECT 
        f.id,
        f.concepto,
        f.peso_medio,
        f.ancho
    FROM Flejes f
    INNER JOIN Tipos_Calidad tc ON f.calidad_id = tc.id
    ${whereClause}
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
    peso_medio: row.peso_medio,
    ancho: row.ancho,
  }));
}

export interface CrearFlejeDTO {
  ancho: number;
  espesor: number;
  peso_total: number;
  concepto: string;
  art_concepto?: string; // Si no viene, tomará el mismo valor que concepto
  unidades: number;
  peso_medio: number;
  activo: boolean;
  calidad_id: number;
}

export interface CrearFlejeResponse {
  id: number;
  ancho: number;
  espesor: number;
  peso_total: number;
  concepto: string;
  art_concepto: string;
  unidades: number;
  peso_medio: number;
  activo: boolean;
  creado: string;
  calidad_id: number;
}

export async function crearFlejeService(
  pool: ConnectionPool,
  data: CrearFlejeDTO,
): Promise<CrearFlejeResponse> {
  // 1. Transformación de datos inicial
  const conceptoLimpio = data.concepto.trim();
  const artConceptoLimpio = data.art_concepto?.trim() || conceptoLimpio;

  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 2. Crear el Request en el contexto de la transacción
    const reqFleje = new Request(transaction);

    reqFleje.input("ancho", Decimal(10, 2), data.ancho);
    reqFleje.input("espesor", Decimal(10, 3), data.espesor);
    reqFleje.input("peso_total", Decimal(10, 2), data.peso_total);
    reqFleje.input("concepto", VarChar(255), conceptoLimpio);
    reqFleje.input("unidades", Int, data.unidades);
    reqFleje.input("peso_medio", Decimal(10, 4), data.peso_medio);
    reqFleje.input("activo", Bit, data.activo);
    reqFleje.input("art_concepto", VarChar(255), artConceptoLimpio);
    reqFleje.input("calidad_id", Int, data.calidad_id);

    const queryInsertFleje = `
      INSERT INTO Flejes (
        ancho,
        espesor,
        peso_total,
        concepto,
        unidades,
        peso_medio,
        activo,
        art_concepto,
        creado,
        calidad_id
      )
      OUTPUT 
        INSERTED.id,
        INSERTED.ancho,
        INSERTED.espesor,
        INSERTED.peso_total,
        INSERTED.concepto,
        INSERTED.unidades,
        INSERTED.peso_medio,
        INSERTED.activo,
        INSERTED.art_concepto,
        INSERTED.creado,
        INSERTED.calidad_id
      VALUES (
        @ancho,
        @espesor,
        @peso_total,
        @concepto,
        @unidades,
        @peso_medio,
        @activo,
        @art_concepto,
        GETDATE(),
        @calidad_id
      );
    `;

    const resFleje = await reqFleje.query(queryInsertFleje);
    const row = resFleje.recordset[0];

    // 3. Confirmar la transacción
    await transaction.commit();

    return {
      id: row.id,
      ancho: row.ancho,
      espesor: row.espesor,
      peso_total: row.peso_total,
      concepto: row.concepto,
      art_concepto: row.art_concepto,
      unidades: row.unidades,
      peso_medio: row.peso_medio,
      activo: Boolean(row.activo),
      creado: row.creado ? new Date(row.creado).toISOString() : "",
      calidad_id: row.calidad_id,
    };
  } catch (error) {
    // Si ocurre un error, revertimos cualquier cambio en la BD
    await transaction.rollback();
    throw error;
  }
}

export interface ActualizarFlejeDTO {
  id: number;
  ancho: number;
  espesor: number;
  peso_total: number;
  concepto: string;
  art_concepto?: string; // Si no viene, tomará el mismo valor que concepto
  unidades: number;
  peso_medio: number;
  activo: boolean;
  calidad_id: number;
}

export interface ActualizarFlejeResponse {
  id: number;
  ancho: number;
  espesor: number;
  peso_total: number;
  concepto: string;
  art_concepto: string;
  unidades: number;
  peso_medio: number;
  activo: boolean;
  creado: string;
  calidad_id: number;
}

export async function actualizarFlejeService(
  pool: ConnectionPool,
  data: ActualizarFlejeDTO,
): Promise<ActualizarFlejeResponse> {
  const req = pool.request();

  // Aseguramos que concepto y art_concepto compartan el mismo valor
  const conceptoLimpio = data.concepto.trim();
  const artConceptoLimpio = data.art_concepto?.trim() || conceptoLimpio;

  // Inyección de parámetros con sus tipos explícitos de MSSQL
  req.input("id", data.id);
  req.input("ancho", data.ancho);
  req.input("espesor", data.espesor);
  req.input("peso_total", data.peso_total);
  req.input("concepto", conceptoLimpio);
  req.input("unidades", data.unidades);
  req.input("peso_medio", data.peso_medio);
  req.input("activo", data.activo);
  req.input("art_concepto", artConceptoLimpio);
  req.input("calidad_id", data.calidad_id);

  const query = `
    UPDATE Flejes
    SET 
      ancho = @ancho,
      espesor = @espesor,
      peso_total = @peso_total,
      concepto = @concepto,
      unidades = @unidades,
      peso_medio = @peso_medio,
      activo = @activo,
      art_concepto = @art_concepto,
      calidad_id = @calidad_id
    OUTPUT 
      INSERTED.id,
      INSERTED.ancho,
      INSERTED.espesor,
      INSERTED.peso_total,
      INSERTED.concepto,
      INSERTED.unidades,
      INSERTED.peso_medio,
      INSERTED.activo,
      INSERTED.art_concepto,
      INSERTED.creado,
      INSERTED.calidad_id
    WHERE id = @id;
  `;

  const resultado = await req.query(query);

  if (resultado.recordset.length === 0) {
    throw new Error(`No se encontró ningún fleje con el ID ${data.id}.`);
  }

  const row = resultado.recordset[0];

  return {
    id: row.id,
    ancho: row.ancho,
    espesor: row.espesor,
    peso_total: row.peso_total,
    concepto: row.concepto,
    art_concepto: row.art_concepto,
    unidades: row.unidades,
    peso_medio: row.peso_medio,
    activo: Boolean(row.activo),
    creado: row.creado ? new Date(row.creado).toISOString() : "",
    calidad_id: row.calidad_id,
  };
}

export interface FlejeDeleteResponse {
  id: number;
  eliminado: boolean;
  relacionesEliminadas: number;
}

/**
 * Servicio para eliminar un Fleje y sus relaciones asociadas.
 */
export async function eliminarFlejeService(
  pool: ConnectionPool,
  id: number,
): Promise<FlejeDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 1. Eliminar relaciones asociadas en Tubos_Maquinas (si aplica)
    const reqDeleteRelaciones = new Request(transaction);
    reqDeleteRelaciones.input("fleje_id", Int, id);

    const queryDeleteRelaciones = `
      DELETE FROM Tubos_Maquinas 
      WHERE fleje_id = @fleje_id;
    `;

    const resRelaciones = await reqDeleteRelaciones.query(
      queryDeleteRelaciones,
    );
    const relacionesEliminadas = resRelaciones.rowsAffected[0] || 0;

    // 2. Eliminar el registro principal en la tabla Flejes
    const reqDeleteFleje = new Request(transaction);
    reqDeleteFleje.input("id", Int, id);

    const queryDeleteFleje = `
      DELETE FROM Flejes 
      WHERE id = @id;
    `;

    const resFleje = await reqDeleteFleje.query(queryDeleteFleje);
    const flejeEliminado = (resFleje.rowsAffected[0] || 0) > 0;

    // Si el registro no existía en la tabla Flejes, revertimos cambios por seguridad
    if (!flejeEliminado) {
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
    // Revertir ante cualquier fallo en la base de datos
    await transaction.rollback();
    throw error;
  }
}

export interface FlejeDetalleResponse {
  id: number;
  calidad_id: number;
  activo: boolean;
  concepto: string;
  art_concepto: string;
  ancho: number;
  espesor: number;
  unidades: number;
  peso_medio: number;
  peso_total: number;
  creado: string;
}

/**
 * Servicio para obtener el detalle de un fleje por su ID.
 */
export async function obtenerFlejePorIdService(
  pool: ConnectionPool,
  id: number,
): Promise<FlejeDetalleResponse | null> {
  const reqFleje = pool.request();
  reqFleje.input("id", id);

  const queryFleje = `
    SELECT 
      id,
      calidad_id,
      activo,
      concepto,
      art_concepto,
      ancho,
      espesor,
      unidades,
      peso_medio,
      peso_total,
      creado
    FROM Flejes
    WHERE id = @id;
  `;

  const resFleje = await reqFleje.query(queryFleje);

  if (resFleje.recordset.length === 0) {
    return null;
  }

  const flejeRow = resFleje.recordset[0];

  return {
    id: flejeRow.id,
    calidad_id: flejeRow.calidad_id,
    activo: Boolean(flejeRow.activo),
    concepto: flejeRow.concepto,
    art_concepto: flejeRow.art_concepto ?? flejeRow.concepto,
    ancho: flejeRow.ancho,
    espesor: flejeRow.espesor,
    unidades: flejeRow.unidades,
    peso_medio: flejeRow.peso_medio,
    peso_total: flejeRow.peso_total,
    creado: flejeRow.creado ? new Date(flejeRow.creado).toISOString() : "",
  };
}
