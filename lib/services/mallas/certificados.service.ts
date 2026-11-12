import { ConnectionPool, Request, Transaction } from "mssql";

export interface FiltrosCertificados {
  buscar?: string;
  fechaInicio?: string;
  fechaFin?: string;
}

export interface ListarCertificadosParams {
  page?: number;
  pageSize?: number;
  orderBy?: "codigo" | "lote" | "creado";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosCertificados;
}

export interface CertificadoRow {
  id: number;
  codigo: string;
  lote: string;
  observacion?: string;
  creado: string;
}

export interface ListarCertificadosResponse {
  data: CertificadoRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar los certificados
 */
export async function listarCertificadosService(
  pool: ConnectionPool,
  params: ListarCertificadosParams
): Promise<ListarCertificadosResponse> {
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
    whereClauses += " AND (c.codigo LIKE @buscar OR c.lote LIKE @buscar)";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  // Rango de fechas sobre el campo 'creado'
  if (filtros?.fechaInicio && filtros?.fechaFin) {
    whereClauses +=
      " AND c.creado >= @fechaInicio AND c.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaInicio", filtros.fechaInicio);
    req.input("fechaFin", filtros.fechaFin);
  } else if (filtros?.fechaInicio) {
    whereClauses += " AND c.creado >= @fechaInicio";
    req.input("fechaInicio", filtros.fechaInicio);
  } else if (filtros?.fechaFin) {
    whereClauses +=
      " AND c.creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaFin", filtros.fechaFin);
  }

  // 2. Determinar orden seguro
  let safeOrderBySql = "";
  if (orderBy) {
    const columnasPermitidas: Record<string, string> = {
      codigo: "c.codigo",
      lote: "c.lote",
      creado: "c.creado",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    safeOrderBySql = "c.id DESC";
  }

  // 3. Query paginada con CTE
  const query = `
    WITH CertificadosPaginados AS (
        SELECT
            c.id,
            c.codigo,
            c.lote,
            c.observacion,
            c.creado,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Mallas_DB_Certificados c
        ${whereClauses}
    )
    SELECT *
    FROM CertificadosPaginados
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
      codigo: row.codigo,
      lote: row.lote,
      observacion: row.observacion,
      creado: row.creado ? new Date(row.creado).toISOString() : "",
    })),
    total,
    page,
    pageSize,
  };
}

export interface FiltrosCertificadosParams {
  filtros?: {
    busqueda?: string;
    fechaInicio?: string;
    fechaFin?: string;
  };
}

export interface ListarFiltrosCertificadosResponse {
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

/**
 * Servicio para obtener selectores y rango de fechas de certificados
 */
export async function listarFiltrosCertificadosService(
  pool: ConnectionPool,
  params: FiltrosCertificadosParams
): Promise<ListarFiltrosCertificadosResponse> {
  const { filtros } = params;
  const fechaInicio = filtros?.fechaInicio;
  const fechaFin = filtros?.fechaFin;

  const reqFechas = pool.request();

  let whereFechas = "WHERE 1=1";
  if (fechaInicio && fechaFin) {
    whereFechas +=
      " AND creado >= @fechaInicio AND creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    reqFechas.input("fechaInicio", fechaInicio);
    reqFechas.input("fechaFin", fechaFin);
  } else if (fechaInicio) {
    whereFechas += " AND creado >= @fechaInicio";
    reqFechas.input("fechaInicio", fechaInicio);
  } else if (fechaFin) {
    whereFechas +=
      " AND creado <= DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    reqFechas.input("fechaFin", fechaFin);
  }

  const qFechas = `
    SELECT 
      MIN(creado) AS minFecha, 
      MAX(creado) AS maxFecha
    FROM Mallas_DB_Certificados
    ${whereFechas};
  `;

  const resFechas = await reqFechas.query(qFechas);
  const rangoRow = resFechas.recordset[0] || {};

  return {
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

// --- CREAR CERTIFICADO ---
export interface CertificadoCreatePayload {
  codigo: string;
  lote: string;
  observacion?: string;
}

export interface CertificadoCreateResponse {
  id: number;
  codigo: string;
}

export async function crearCertificadoService(
  pool: ConnectionPool,
  payload: CertificadoCreatePayload
): Promise<CertificadoCreateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("codigo", payload.codigo.trim());
    req.input("lote", payload.lote.trim());
    req.input("observacion", payload.observacion || null);

    const query = `
        INSERT INTO Mallas_DB_Certificados (
          codigo, lote, observacion, creado
        )
        OUTPUT INSERTED.id
        VALUES (
          @codigo, @lote, @observacion, SYSDATETIME()
        );
      `;

    const res = await req.query(query);
    const nuevoId = res.recordset[0].id;

    await transaction.commit();

    return {
      id: nuevoId,
      codigo: payload.codigo,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// --- ACTUALIZAR CERTIFICADO ---
export interface CertificadoUpdatePayload extends CertificadoCreatePayload {
  id: number;
}

export interface CertificadoUpdateResponse {
  id: number;
  codigo: string;
}

export async function actualizarCertificadoService(
  pool: ConnectionPool,
  payload: CertificadoUpdatePayload
): Promise<CertificadoUpdateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("id", payload.id);
    req.input("codigo", payload.codigo.trim());
    req.input("lote", payload.lote.trim());
    req.input("observacion", payload.observacion || null);

    const query = `
        UPDATE Mallas_DB_Certificados
        SET 
          codigo = @codigo,
          lote = @lote,
          observacion = @observacion
        WHERE id = @id;
      `;

    await req.query(query);
    await transaction.commit();

    return {
      id: payload.id,
      codigo: payload.codigo,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

// --- OBTENER POR ID ---
export async function obtenerCertificadoPorIdService(
  pool: ConnectionPool,
  id: number
): Promise<CertificadoRow | null> {
  const req = pool.request();
  req.input("id", id);

  const query = `
    SELECT id, codigo, lote, observacion, creado
    FROM Mallas_DB_Certificados
    WHERE id = @id;
  `;

  const res = await req.query(query);
  if (res.recordset.length === 0) return null;

  const row = res.recordset[0];
  return {
    id: row.id,
    codigo: row.codigo,
    lote: row.lote,
    observacion: row.observacion,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
  };
}

// --- ELIMINAR CERTIFICADO ---
export interface CertificadoDeleteResponse {
  id: number;
  eliminado: boolean;
}

export async function eliminarCertificadoService(
  pool: ConnectionPool,
  id: number
): Promise<CertificadoDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const req = new Request(transaction);
    req.input("id", id);

    const query = `
        DELETE FROM Mallas_DB_Certificados 
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
