import { ConnectionPool, Request, Transaction } from "mssql";

export interface FiltrosEtiquetas {
  buscar?: string;
  maquina_id?: number;
  turno_id?: number;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarEtiquetasParams {
  page?: number;
  pageSize?: number;
  orderBy?: "lote" | "no_paquete" | "creado";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosEtiquetas;
}

export interface EtiquetaRow {
  id: number;
  creado: string;
  maquina_id: number;
  maquina_nombre?: string;
  maquina_codigo?: string;
  turno_id: number;
  turno_prefijo?: string;
  turno_entrada?: string;
  turno_salida?: string;
  malla_id: number;
  malla_codigo?: string;
  no_paquete: number;
  lote: string;
}

export interface ListarEtiquetasResponse {
  data: EtiquetaRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar las etiquetas
 */
export async function listarEtiquetasService(
  pool: ConnectionPool,
  params: ListarEtiquetasParams
): Promise<ListarEtiquetasResponse> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

  const rowStart = (page - 1) * pageSize + 1;
  const rowEnd = page * pageSize;

  const { filtros, orderBy, orderDir = "DESC" } = params;
  const req = pool.request();

  // 1. Construcción dinámica de Cláusulas WHERE
  let whereClauses = "WHERE 1=1";

  if (filtros?.buscar) {
    whereClauses += " AND e.lote LIKE @buscar";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  if (filtros?.maquina_id) {
    whereClauses += " AND e.maquina_id = @maquinaId";
    req.input("maquinaId", filtros.maquina_id);
  }

  if (filtros?.turno_id) {
    whereClauses += " AND e.turno_id = @turnoId";
    req.input("turnoId", filtros.turno_id);
  }

  // Rango de fechas sobre el campo 'creado'
  if (filtros?.fechaInicio && filtros?.fechaFin) {
    whereClauses +=
      " AND e.creado >= @fechaInicio AND e.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaInicio", filtros.fechaInicio);
    req.input("fechaFin", filtros.fechaFin);
  } else if (filtros?.fechaInicio) {
    whereClauses += " AND e.creado >= @fechaInicio";
    req.input("fechaInicio", filtros.fechaInicio);
  } else if (filtros?.fechaFin) {
    whereClauses +=
      " AND e.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaFin", filtros.fechaFin);
  }

  // 2. Determinar orden seguro
  let safeOrderBySql = "";
  if (orderBy) {
    const columnasPermitidas: Record<string, string> = {
      lote: "e.lote",
      no_paquete: "e.no_paquete",
      creado: "e.creado",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    safeOrderBySql = "e.id DESC";
  }

  // 3. Query paginada con CTE y JOINs requeridos (Turnos, Maquinas, Mallas_DB_Mallas)
  const query = `
    WITH EtiquetasPaginadas AS (
        SELECT
            e.id,
            e.creado,
            e.maquina_id,
            mq.nombre AS maquina_nombre,
            mq.maquina AS maquina_codigo,
            e.turno_id,
            t.prefijo AS turno_prefijo,
            t.entrada AS turno_entrada,
            t.salida AS turno_salida,
            e.malla_id,
            m.codigo AS malla_codigo,
            e.no_paquete,
            e.lote,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Mallas_DB_Etiquetas e
        LEFT JOIN Maquinas mq ON e.maquina_id = mq.id
        LEFT JOIN Turnos t ON e.turno_id = t.id
        LEFT JOIN Mallas_DB_Mallas m ON e.malla_id = m.id
        ${whereClauses}
    )
    SELECT *
    FROM EtiquetasPaginadas
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
      creado: row.creado ? new Date(row.creado).toISOString() : "",
      maquina_id: row.maquina_id,
      maquina_nombre: row.maquina_nombre,
      maquina_codigo: row.maquina_codigo,
      turno_id: row.turno_id,
      turno_prefijo: row.turno_prefijo,
      turno_entrada: row.turno_entrada,
      turno_salida: row.turno_salida,
      malla_id: row.malla_id,
      malla_codigo: row.malla_codigo,
      no_paquete: row.no_paquete,
      lote: row.lote,
    })),
    total,
    page,
    pageSize,
  };
}

// --- FILTROS CRUZADOS DE ETIQUETAS ---
export interface FiltrosEtiquetasParams {
  filtros?: {
    busqueda?: string;
    maquina_id?: number;
    turno_id?: number;
    fechaInicio?: string;
    fechaFin?: string;
  };
}

export interface ListarFiltrosEtiquetasResponse {
  maquinas: Array<{ id: number; nombre: string; maquina: string }>;
  turnos: Array<{
    id: number;
    prefijo: string;
    entrada: string;
    salida: string;
  }>;
}

export async function listarFiltrosEtiquetasService(
  pool: ConnectionPool,
  params: FiltrosEtiquetasParams
): Promise<ListarFiltrosEtiquetasResponse> {
  const { filtros } = params;

  const maquinaId = filtros?.maquina_id;
  const turnoId = filtros?.turno_id;
  const fechaInicio = filtros?.fechaInicio;
  const fechaFin = filtros?.fechaFin;

  const reqMaquinas = pool.request();
  const reqTurnos = pool.request();

  const aplicarFiltrosComunes = (req: Request, omitir: string) => {
    let sql = "";
    if (maquinaId && omitir !== "maquina") {
      sql += " AND e.maquina_id = @maquinaId";
      req.input("maquinaId", maquinaId);
    }
    if (turnoId && omitir !== "turno") {
      sql += " AND e.turno_id = @turnoId";
      req.input("turnoId", turnoId);
    }
    if (fechaInicio && fechaFin && omitir !== "fecha") {
      sql +=
        " AND e.creado >= @fechaInicio AND e.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
      req.input("fechaInicio", fechaInicio);
      req.input("fechaFin", fechaFin);
    } else if (fechaInicio && omitir !== "fecha") {
      sql += " AND e.creado >= @fechaInicio";
      req.input("fechaInicio", fechaInicio);
    } else if (fechaFin && omitir !== "fecha") {
      sql += " AND e.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
      req.input("fechaFin", fechaFin);
    }
    return sql;
  };

  const whereMaquinas =
    "WHERE 1=1" + aplicarFiltrosComunes(reqMaquinas, "maquina");
  const qMaquinas = `
    SELECT DISTINCT mq.id, mq.nombre, mq.maquina
    FROM Mallas_DB_Etiquetas e
    INNER JOIN Maquinas mq ON e.maquina_id = mq.id
    ${whereMaquinas}
    ORDER BY mq.nombre ASC;
  `;

  const whereTurnos = "WHERE 1=1" + aplicarFiltrosComunes(reqTurnos, "turno");
  const qTurnos = `
    SELECT DISTINCT t.id, t.prefijo, t.entrada, t.salida
    FROM Mallas_DB_Etiquetas e
    INNER JOIN Turnos t ON e.turno_id = t.id
    ${whereTurnos}
    ORDER BY t.prefijo ASC;
  `;

  const [resMaquinas, resTurnos] = await Promise.all([
    reqMaquinas.query(qMaquinas),
    reqTurnos.query(qTurnos),
  ]);

  return {
    maquinas: resMaquinas.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      maquina: row.maquina,
    })),
    turnos: resTurnos.recordset.map((row) => ({
      id: row.id,
      prefijo: row.prefijo,
      entrada: row.entrada,
      salida: row.salida,
    })),
  };
}

// --- CREAR ETIQUETA ---
export interface EtiquetaCreatePayload {
  maquina_id: number;
  turno_id: number;
  malla_id: number;
  no_paquete: number;
  lote: string;
}

export interface EtiquetaCreateResponse {
  id: number;
  lote: string;
}

export async function crearEtiquetaService(
  pool: ConnectionPool,
  payload: EtiquetaCreatePayload
): Promise<EtiquetaCreateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("maquina_id", payload.maquina_id);
    req.input("turno_id", payload.turno_id);
    req.input("malla_id", payload.malla_id);
    req.input("no_paquete", payload.no_paquete);
    req.input("lote", payload.lote.trim());

    const query = `
      INSERT INTO Mallas_DB_Etiquetas (
        maquina_id, turno_id, malla_id, no_paquete, lote, creado
      )
      OUTPUT INSERTED.id
      VALUES (
        @maquina_id, @turno_id, @malla_id, @no_paquete, @lote, SYSDATETIME()
      );
    `;

    const res = await req.query(query);
    const nuevoId = res.recordset[0].id;

    await transaction.commit();

    return {
      id: nuevoId,
      lote: payload.lote,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// --- ACTUALIZAR ETIQUETA ---
export interface EtiquetaUpdatePayload extends EtiquetaCreatePayload {
  id: number;
}

export interface EtiquetaUpdateResponse {
  id: number;
  lote: string;
}

export async function actualizarEtiquetaService(
  pool: ConnectionPool,
  payload: EtiquetaUpdatePayload
): Promise<EtiquetaUpdateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("id", payload.id);
    req.input("maquina_id", payload.maquina_id);
    req.input("turno_id", payload.turno_id);
    req.input("malla_id", payload.malla_id);
    req.input("no_paquete", payload.no_paquete);
    req.input("lote", payload.lote.trim());

    const query = `
      UPDATE Mallas_DB_Etiquetas
      SET 
        maquina_id = @maquina_id,
        turno_id = @turno_id,
        malla_id = @malla_id,
        no_paquete = @no_paquete,
        lote = @lote
      WHERE id = @id;
    `;

    await req.query(query);
    await transaction.commit();

    return {
      id: payload.id,
      lote: payload.lote,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// --- ELIMINAR ETIQUETA ---
export interface EtiquetaDeleteResponse {
  id: number;
  eliminado: boolean;
}

export async function eliminarEtiquetaService(
  pool: ConnectionPool,
  id: number
): Promise<EtiquetaDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("id", id);

    const query = `
      DELETE FROM Mallas_DB_Etiquetas 
      WHERE id = @id;
    `;

    const res = await req.query(query);
    const eliminado = (res.rowsAffected[0] || 0) > 0;

    if (!eliminado) {
      await transaction.rollback();
      return { id, eliminado: false };
    }

    await transaction.commit();
    return { id, eliminado: true };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
