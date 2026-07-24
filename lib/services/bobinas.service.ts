import { ConnectionPool, Request, Transaction } from "mssql";

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

export interface CrearBobinaDTO {
  fabricante_id: number;
  calidad_id: number;
  concepto: string;
  art_concepto?: string; // Si no viene, se iguala a concepto
  espesor: number;
  ancho: number;
  peso_medio: number;
  activa: boolean;
  unidades: number;
  peso_total?: number; // Se recibe del Zod pero se ignora para la BD
}

export interface CrearBobinaResponse {
  id: number;
  fabricante_id: number;
  calidad_id: number;
  concepto: string;
  art_concepto: string;
  espesor: number;
  ancho: number;
  peso_medio: number;
  activa: boolean;
  unidades: number;
  creado: string;
}

export async function crearBobinaService(
  pool: ConnectionPool,
  data: CrearBobinaDTO,
): Promise<CrearBobinaResponse> {
  // 1. Transformación de datos inicial
  const conceptoLimpio = data.concepto.trim();
  const artConceptoLimpio = data.art_concepto?.trim() || conceptoLimpio;

  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // 2. Crear el Request en el contexto de la transacción
    const reqBobina = new Request(transaction);

    reqBobina.input("fabricante_id", data.fabricante_id);
    reqBobina.input("calidad_id", data.calidad_id);
    reqBobina.input("concepto", conceptoLimpio);
    reqBobina.input("art_concepto", artConceptoLimpio);
    reqBobina.input("espesor", data.espesor);
    reqBobina.input("ancho", data.ancho);
    reqBobina.input("peso_medio", data.peso_medio);
    reqBobina.input("activa", data.activa);
    reqBobina.input("unidades", data.unidades);

    const queryInsertBobina = `
      INSERT INTO bobinas (
        fabricante_id,
        calidad_id,
        concepto,
        art_concepto,
        espesor,
        ancho,
        peso_medio,
        activa,
        unidades,
        creado
      )
      OUTPUT 
        INSERTED.id,
        INSERTED.fabricante_id,
        INSERTED.calidad_id,
        INSERTED.concepto,
        INSERTED.art_concepto,
        INSERTED.espesor,
        INSERTED.ancho,
        INSERTED.peso_medio,
        INSERTED.activa,
        INSERTED.unidades,
        INSERTED.creado
      VALUES (
        @fabricante_id,
        @calidad_id,
        @concepto,
        @art_concepto,
        @espesor,
        @ancho,
        @peso_medio,
        @activa,
        @unidades,
        GETDATE()
      );
    `;

    const resBobina = await reqBobina.query(queryInsertBobina);
    const row = resBobina.recordset[0];

    // 3. Confirmar la transacción
    await transaction.commit();

    return {
      id: row.id,
      fabricante_id: row.fabricante_id,
      calidad_id: row.calidad_id,
      concepto: row.concepto,
      art_concepto: row.art_concepto,
      espesor: row.espesor,
      ancho: row.ancho,
      peso_medio: row.peso_medio,
      activa: Boolean(row.activa),
      unidades: row.unidades,
      creado: row.creado ? new Date(row.creado).toISOString() : "",
    };
  } catch (error) {
    // Si ocurre un error, revertimos cualquier cambio en la BD
    await transaction.rollback();
    throw error;
  }
}

export interface ActualizarBobinaDTO {
  id: number;
  fabricante_id: number;
  calidad_id: number;
  concepto: string;
  art_concepto?: string; // Si no viene, tomará el mismo valor que concepto
  espesor: number;
  ancho: number;
  peso_medio: number;
  activa: boolean;
  unidades: number;
  peso_total?: number; // Se recibe del DTO/Zod pero se ignora para la BD
}

export interface ActualizarBobinaResponse {
  id: number;
  fabricante_id: number;
  calidad_id: number;
  concepto: string;
  art_concepto: string;
  espesor: number;
  ancho: number;
  peso_medio: number;
  activa: boolean;
  unidades: number;
  creado: string;
}

export async function actualizarBobinaService(
  pool: ConnectionPool,
  data: ActualizarBobinaDTO,
): Promise<ActualizarBobinaResponse> {
  const req = pool.request();

  // 1. Transformación de datos inicial
  const conceptoLimpio = data.concepto.trim();
  const artConceptoLimpio = data.art_concepto?.trim() || conceptoLimpio;

  // 2. Inyección de parámetros con sus tipos explícitos de MSSQL
  req.input("id", data.id);
  req.input("fabricante_id", data.fabricante_id);
  req.input("calidad_id", data.calidad_id);
  req.input("concepto", conceptoLimpio);
  req.input("art_concepto", artConceptoLimpio);
  req.input("espesor", data.espesor);
  req.input("ancho", data.ancho);
  req.input("peso_medio", data.peso_medio);
  req.input("activa", data.activa);
  req.input("unidades", data.unidades);

  const query = `
    UPDATE bobinas
    SET 
      fabricante_id = @fabricante_id,
      calidad_id = @calidad_id,
      concepto = @concepto,
      art_concepto = @art_concepto,
      espesor = @espesor,
      ancho = @ancho,
      peso_medio = @peso_medio,
      activa = @activa,
      unidades = @unidades
    OUTPUT 
      INSERTED.id,
      INSERTED.fabricante_id,
      INSERTED.calidad_id,
      INSERTED.concepto,
      INSERTED.art_concepto,
      INSERTED.espesor,
      INSERTED.ancho,
      INSERTED.peso_medio,
      INSERTED.activa,
      INSERTED.unidades,
      INSERTED.creado
    WHERE id = @id;
  `;

  const resultado = await req.query(query);

  if (resultado.recordset.length === 0) {
    throw new Error(`No se encontró ninguna bobina con el ID ${data.id}.`);
  }

  const row = resultado.recordset[0];

  return {
    id: row.id,
    fabricante_id: row.fabricante_id,
    calidad_id: row.calidad_id,
    concepto: row.concepto,
    art_concepto: row.art_concepto,
    espesor: row.espesor,
    ancho: row.ancho,
    peso_medio: row.peso_medio,
    activa: Boolean(row.activa),
    unidades: row.unidades,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
  };
}

export interface DetalleBobinaResponse {
  id: number;
  fabricante_id: number;
  calidad_id: number;
  concepto: string;
  art_concepto: string;
  espesor: number;
  ancho: number;
  peso_medio: number;
  unidades: number;
  peso_total: number; // Calculado dinámicamente: unidades * peso_medio
  activa: boolean;
  creado: string;
}

export async function obtenerBobinaPorIdService(
  pool: ConnectionPool,
  id: number,
): Promise<DetalleBobinaResponse> {
  const req = pool.request();
  req.input("id", id);

  const query = `
    SELECT 
      id,
      fabricante_id,
      calidad_id,
      concepto,
      art_concepto,
      espesor,
      ancho,
      peso_medio,
      unidades,
      activa,
      creado
    FROM bobinas
    WHERE id = @id;
  `;

  const resultado = await req.query(query);

  if (resultado.recordset.length === 0) {
    throw new Error(`No se encontró ninguna bobina con el ID ${id}.`);
  }

  const row = resultado.recordset[0];
  const pesoMedio = Number(row.peso_medio) || 0;
  const unidades = Number(row.unidades) || 0;

  return {
    id: row.id,
    fabricante_id: row.fabricante_id,
    calidad_id: row.calidad_id,
    concepto: row.concepto,
    art_concepto: row.art_concepto,
    espesor: Number(row.espesor),
    ancho: Number(row.ancho),
    peso_medio: pesoMedio,
    unidades: unidades,
    peso_total: Number((unidades * pesoMedio).toFixed(3)),
    activa: Boolean(row.activa),
    creado: row.creado ? new Date(row.creado).toISOString() : "",
  };
}

export interface BobinaDeleteResponse {
  id: number;
  eliminado: boolean;
}

/**
 * Servicio para eliminar una Bobina.
 */
export async function eliminarBobinaService(
  pool: ConnectionPool,
  id: number,
): Promise<BobinaDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // Eliminar el registro principal en la tabla Bobinas
    const reqDeleteBobina = new Request(transaction);
    reqDeleteBobina.input("id", id);

    const queryDeleteBobina = `
      DELETE FROM Bobinas 
      WHERE id = @id;
    `;

    const resBobina = await reqDeleteBobina.query(queryDeleteBobina);
    const bobinaEliminada = (resBobina.rowsAffected[0] || 0) > 0;

    // Si el registro no existía, revertimos cambios
    if (!bobinaEliminada) {
      await transaction.rollback();
      return {
        id,
        eliminado: false,
      };
    }

    // Confirmar la transacción
    await transaction.commit();

    return {
      id,
      eliminado: true,
    };
  } catch (error) {
    // Revertir ante cualquier fallo en la base de datos
    await transaction.rollback();
    throw error;
  }
}
