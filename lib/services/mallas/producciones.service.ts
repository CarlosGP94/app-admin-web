import { ConnectionPool, Request, Transaction } from "mssql";

export interface FiltrosProduccionMallas {
  buscar?: string;
  maquina_id?: number;
  diametro?: number;
  fechaInicio?: string; // Formato 'YYYY-MM-DD' o ISO
  fechaFin?: string; // Formato 'YYYY-MM-DD' o ISO
}
export interface FiltrosProduccionMallas {
  buscar?: string;
  maquina_id?: number;
  diametro?: number;
  fechaInicio?: string; // Formato 'YYYY-MM-DD' o ISO
  fechaFin?: string; // Formato 'YYYY-MM-DD' o ISO
}

export interface ListarProduccionMallasParams {
  page?: number;
  pageSize?: number;
  orderBy?:
    | "lote"
    | "paquete"
    | "diametro"
    | "ancho"
    | "largo"
    | "unidades"
    | "creado";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosProduccionMallas;
}

export interface ProduccionMallaRow {
  id: number;
  turno_id: number;
  malla_id: number;
  malla_codigo?: string; // Añadido para recibir el código de la malla
  paquete: number;
  lote: string;
  unidades: number;
  sl: number;
  st: number;
  longitudinales: number;
  transversales: number;
  diametro: number;
  observacion: string;
  ancho: number;
  largo: number;
  maquina_id: number;
  maquina_nombre?: string;
  creado: string;
}

export interface ListarProduccionMallasResponse {
  data: ProduccionMallaRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar la producción de mallas
 */
export async function listarProduccionMallasService(
  pool: ConnectionPool,
  params: ListarProduccionMallasParams
): Promise<ListarProduccionMallasResponse> {
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
    whereClauses += " AND (p.lote LIKE @buscar OR p.observacion LIKE @buscar)";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  if (filtros?.maquina_id) {
    whereClauses += " AND p.maquina_id = @maquinaId";
    req.input("maquinaId", filtros.maquina_id);
  }

  if (filtros?.diametro) {
    whereClauses += " AND p.diametro = @diametro";
    req.input("diametro", filtros.diametro);
  }

  // Lógica de rango de fechas sobre el campo 'creado'
  if (filtros?.fechaInicio && filtros?.fechaFin) {
    whereClauses +=
      " AND p.creado >= @fechaInicio AND p.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaInicio", filtros.fechaInicio);
    req.input("fechaFin", filtros.fechaFin);
  } else if (filtros?.fechaInicio) {
    whereClauses += " AND p.creado >= @fechaInicio";
    req.input("fechaInicio", filtros.fechaInicio);
  } else if (filtros?.fechaFin) {
    whereClauses +=
      " AND p.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaFin", filtros.fechaFin);
  }

  // 2. Determinar orden seguro
  let safeOrderBySql = "";
  if (orderBy) {
    const columnasPermitidas: Record<string, string> = {
      lote: "p.lote",
      paquete: "p.paquete",
      diametro: "p.diametro",
      ancho: "p.ancho",
      largo: "p.largo",
      unidades: "p.unidades",
      creado: "p.creado",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    safeOrderBySql = "p.id DESC";
  }

  // 3. Query paginada con CTE, JOIN a Maquinas y JOIN a Mallas_DB_Mallas
  const query = `
    WITH ProduccionPaginada AS (
        SELECT
            p.id,
            p.turno_id,
            p.malla_id,
            mm.codigo AS malla_codigo,
            p.paquete,
            p.lote,
            p.unidades,
            p.sl,
            p.st,
            p.longitudinales,
            p.transversales,
            p.diametro,
            p.observacion,
            p.ancho,
            p.largo,
            p.maquina_id,
            m.nombre AS maquina_nombre,
            p.creado,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Mallas_DB_Produccion p
        LEFT JOIN Maquinas m ON p.maquina_id = m.id
        LEFT JOIN Mallas_DB_Mallas mm ON p.malla_id = mm.id
        ${whereClauses}
    )
    SELECT *
    FROM ProduccionPaginada
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
      turno_id: row.turno_id,
      malla_id: row.malla_id,
      malla_codigo: row.malla_codigo,
      paquete: row.paquete,
      lote: row.lote,
      unidades: row.unidades,
      sl: row.sl,
      st: row.st,
      longitudinales: row.longitudinales,
      transversales: row.transversales,
      diametro: row.diametro,
      observacion: row.observacion,
      ancho: row.ancho,
      largo: row.largo,
      maquina_id: row.maquina_id,
      maquina_nombre: row.maquina_nombre,
      creado: row.creado ? new Date(row.creado).toISOString() : "",
    })),
    total,
    page,
    pageSize,
  };
}

export interface FiltrosProduccionParams {
  filtros?: {
    busqueda?: string;
    maquina_id?: number;
    diametro?: number;
    fechaInicio?: string;
    fechaFin?: string;
  };
}

export interface ListarFiltrosProduccionResponse {
  maquinas: Array<{ id: number; nombre: string; maquina: string }>;
  diametros: number[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

/**
 * Servicio para obtener selectores dinámicos y cruzados de producción
 */
export async function listarFiltrosProduccionService(
  pool: ConnectionPool,
  params: FiltrosProduccionParams
): Promise<ListarFiltrosProduccionResponse> {
  const { filtros } = params;

  const maquinaId = filtros?.maquina_id;
  const diametro = filtros?.diametro;
  const fechaInicio = filtros?.fechaInicio;
  const fechaFin = filtros?.fechaFin;

  const reqMaquinas = pool.request();
  const reqDiametros = pool.request();
  const reqFechas = pool.request(); // Request para el rango de fechas

  // Helper para aplicar filtros cruzados omitiendo el filtro actual para que no se anule a sí mismo
  const aplicarFiltrosComunes = (req: Request, omitir: string) => {
    let sql = "";

    if (maquinaId && omitir !== "maquina") {
      sql += " AND p.maquina_id = @maquinaId";
      req.input("maquinaId", maquinaId);
    }
    if (diametro && omitir !== "diametro") {
      sql += " AND p.diametro = @diametro";
      req.input("diametro", diametro);
    }
    if (fechaInicio && fechaFin && omitir !== "fecha") {
      sql +=
        " AND p.creado >= @fechaInicio AND p.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
      req.input("fechaInicio", fechaInicio);
      req.input("fechaFin", fechaFin);
    } else if (fechaInicio && omitir !== "fecha") {
      sql += " AND p.creado >= @fechaInicio";
      req.input("fechaInicio", fechaInicio);
    } else if (fechaFin && omitir !== "fecha") {
      sql += " AND p.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
      req.input("fechaFin", fechaFin);
    }

    return sql;
  };

  // --- QUERY 1: MÁQUINAS ---
  const whereMaquinas =
    "WHERE 1=1" + aplicarFiltrosComunes(reqMaquinas, "maquina");
  const qMaquinas = `
    SELECT DISTINCT mq.id, mq.nombre, mq.maquina
    FROM Mallas_DB_Produccion p
    INNER JOIN Maquinas mq ON p.maquina_id = mq.id
    ${whereMaquinas}
    ORDER BY mq.nombre ASC;
  `;

  // --- QUERY 2: DIÁMETROS ---
  const whereDiametros =
    "WHERE 1=1 AND p.diametro IS NOT NULL" +
    aplicarFiltrosComunes(reqDiametros, "diametro");
  const qDiametros = `
    SELECT DISTINCT p.diametro
    FROM Mallas_DB_Produccion p
    ${whereDiametros}
    ORDER BY p.diametro ASC;
  `;

  // --- QUERY 3: RANGO DE FECHAS (Mínima y Máxima global o filtrada) ---
  const whereFechas = "WHERE 1=1" + aplicarFiltrosComunes(reqFechas, "fecha");
  const qFechas = `
    SELECT 
      MIN(p.creado) AS minFecha, 
      MAX(p.creado) AS maxFecha
    FROM Mallas_DB_Produccion p
    ${whereFechas};
  `;

  // Ejecución paralela
  const [resMaquinas, resDiametros, resFechas] = await Promise.all([
    reqMaquinas.query(qMaquinas),
    reqDiametros.query(qDiametros),
    reqFechas.query(qFechas),
  ]);

  const rangoRow = resFechas.recordset[0] || {};

  return {
    maquinas: resMaquinas.recordset.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      maquina: row.maquina,
    })),
    diametros: resDiametros.recordset.map((row) => row.diametro),
    rangoFechas: {
      minFecha: rangoRow.minFecha
        ? new Date(rangoRow.minFecha).toISOString()
        : null,
      maxFecha: rangoRow.maxFecha
        ? new Date(rangoRow.maxFecha).toISOString()
        : null,
    },
  };
}

// --- CREAR PRODUCCIÓN ---
export interface ProduccionMallaCreatePayload {
  turno_id: number;
  malla_id: number;
  paquete: number;
  lote: string;
  unidades: number;
  sl: number;
  st: number;
  longitudinales: number;
  transversales: number;
  diametro: number;
  observacion?: string;
  ancho: number;
  largo: number;
  maquina_id: number;
}

export interface ProduccionMallaCreateResponse {
  id: number;
  lote: string;
}

export async function crearProduccionMallaService(
  pool: ConnectionPool,
  payload: ProduccionMallaCreatePayload
): Promise<ProduccionMallaCreateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("turno_id", payload.turno_id);
    req.input("malla_id", payload.malla_id);
    req.input("paquete", payload.paquete);
    req.input("lote", payload.lote.trim());
    req.input("unidades", payload.unidades);
    req.input("sl", payload.sl);
    req.input("st", payload.st);
    req.input("longitudinales", payload.longitudinales);
    req.input("transversales", payload.transversales);
    req.input("diametro", payload.diametro);
    req.input("observacion", payload.observacion || null);
    req.input("ancho", payload.ancho);
    req.input("largo", payload.largo);
    req.input("maquina_id", payload.maquina_id);

    const query = `
        INSERT INTO Mallas_DB_Produccion (
          turno_id, malla_id, paquete, lote, unidades, sl, st,
          longitudinales, transversales, diametro, observacion,
          ancho, largo, maquina_id, creado
        )
        OUTPUT INSERTED.id
        VALUES (
          @turno_id, @malla_id, @paquete, @lote, @unidades, @sl, @st,
          @longitudinales, @transversales, @diametro, @observacion,
          @ancho, @largo, @maquina_id, SYSDATETIME()
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

// --- ACTUALIZAR PRODUCCIÓN ---
export interface ProduccionMallaUpdatePayload
  extends ProduccionMallaCreatePayload {
  id: number;
}

export interface ProduccionMallaUpdateResponse {
  id: number;
  lote: string;
}

export async function actualizarProduccionMallaService(
  pool: ConnectionPool,
  payload: ProduccionMallaUpdatePayload
): Promise<ProduccionMallaUpdateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("id", payload.id);
    req.input("turno_id", payload.turno_id);
    req.input("malla_id", payload.malla_id);
    req.input("paquete", payload.paquete);
    req.input("lote", payload.lote.trim());
    req.input("unidades", payload.unidades);
    req.input("sl", payload.sl);
    req.input("st", payload.st);
    req.input("longitudinales", payload.longitudinales);
    req.input("transversales", payload.transversales);
    req.input("diametro", payload.diametro);
    req.input("observacion", payload.observacion || null);
    req.input("ancho", payload.ancho);
    req.input("largo", payload.largo);
    req.input("maquina_id", payload.maquina_id);

    const query = `
        UPDATE Mallas_DB_Produccion
        SET 
          turno_id = @turno_id,
          malla_id = @malla_id,
          paquete = @paquete,
          lote = @lote,
          unidades = @unidades,
          sl = @sl,
          st = @st,
          longitudinales = @longitudinales,
          transversales = @transversales,
          diametro = @diametro,
          observacion = @observacion,
          ancho = @ancho,
          largo = @largo,
          maquina_id = @maquina_id
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

// --- ELIMINAR PRODUCCIÓN ---
export interface ProduccionMallaDeleteResponse {
  id: number;
  eliminado: boolean;
}

export async function eliminarProduccionMallaService(
  pool: ConnectionPool,
  id: number
): Promise<ProduccionMallaDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("id", id);

    const query = `
        DELETE FROM Mallas_DB_Produccion 
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
