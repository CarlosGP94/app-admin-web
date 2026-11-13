import type { ConnectionPool } from "mssql";

export interface ListarCertificadosParams {
  page?: number;
  pageSize?: number;
  orderBy?: "certificado" | "creado";
  orderDir?: "ASC" | "DESC";
  buscar?: string;
}

export interface CertificadoRow {
  id: number;
  certificado: string;
  imagen: string | null;
  creado: string;
}

export interface ListarCertificadosResponse {
  data: CertificadoRow[];
  total: number;
  page: number;
  pageSize: number;
}

function mapCertificadoRow(row: Record<string, unknown>): CertificadoRow {
  return {
    id: Number(row.id),
    certificado: row.certificado != null ? String(row.certificado) : "",
    imagen: row.imagen != null ? String(row.imagen) : null,
    creado: row.creado ? new Date(row.creado as string | Date).toISOString() : "",
  };
}

/**
 * Lista los certificados de forma paginada. No aplica filtros por fecha,
 * solo la búsqueda opcional por nombre de certificado.
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

  const { orderBy, orderDir = "DESC", buscar } = params;
  const req = pool.request();

  let safeOrderBySql = "id DESC";
  if (orderBy) {
    const columnasPermitidas: Record<string, string> = {
      certificado: "certificado",
      creado: "creado",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  }

  req.input("buscar", buscar ? `%${buscar}%` : null);
  req.input("rowStart", rowStart);
  req.input("rowEnd", rowEnd);

  const query = `
    WITH CertificadosPaginados AS (
        SELECT
            id,
            certificado,
            imagen,
            creado,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Mallas_DB_Certificados
        WHERE (@buscar IS NULL OR certificado LIKE @buscar)
    )
    SELECT *
    FROM CertificadosPaginados
    WHERE RowNum BETWEEN @rowStart AND @rowEnd;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;
  const total = rows.length > 0 ? Number(rows[0].TotalCount) : 0;

  return {
    data: rows.map(mapCertificadoRow),
    total,
    page,
    pageSize,
  };
}

// --- CREAR CERTIFICADO ---
export interface CertificadoCreatePayload {
  certificado: string;
  imagen?: string | null;
}

export interface CertificadoCreateResponse {
  id: number;
  certificado: string;
}

export async function crearCertificadoService(
  pool: ConnectionPool,
  payload: CertificadoCreatePayload
): Promise<CertificadoCreateResponse> {
  const certificado = payload.certificado.trim();
  const req = pool.request();
  req.input("certificado", certificado);
  req.input("imagen", payload.imagen ?? null);

  const res = await req.query(`
    INSERT INTO Mallas_DB_Certificados (certificado, imagen)
    OUTPUT INSERTED.id
    VALUES (@certificado, @imagen);
  `);

  return {
    id: Number(res.recordset[0].id),
    certificado,
  };
}

// --- ACTUALIZAR CERTIFICADO ---
export interface CertificadoUpdatePayload {
  id: number;
  certificado: string;
  imagen: string | null;
}

export interface CertificadoUpdateResponse {
  id: number;
  certificado: string;
  actualizado: boolean;
}

export async function actualizarCertificadoService(
  pool: ConnectionPool,
  payload: CertificadoUpdatePayload
): Promise<CertificadoUpdateResponse> {
  const certificado = payload.certificado.trim();
  const req = pool.request();
  req.input("id", payload.id);
  req.input("certificado", certificado);
  req.input("imagen", payload.imagen);

  const res = await req.query(`
    UPDATE Mallas_DB_Certificados
    SET certificado = @certificado,
        imagen = @imagen
    WHERE id = @id;
  `);

  return {
    id: payload.id,
    certificado,
    actualizado: (res.rowsAffected[0] || 0) > 0,
  };
}

// --- OBTENER POR ID ---
export async function obtenerCertificadoPorIdService(
  pool: ConnectionPool,
  id: number
): Promise<CertificadoRow | null> {
  const req = pool.request();
  req.input("id", id);

  const res = await req.query(`
    SELECT id, certificado, imagen, creado
    FROM Mallas_DB_Certificados
    WHERE id = @id;
  `);

  if (res.recordset.length === 0) return null;

  return mapCertificadoRow(res.recordset[0]);
}

// --- ELIMINAR CERTIFICADO ---
export interface CertificadoDeleteResponse {
  id: number;
  eliminado: boolean;
  imagen: string | null;
}

export async function eliminarCertificadoService(
  pool: ConnectionPool,
  id: number
): Promise<CertificadoDeleteResponse> {
  const req = pool.request();
  req.input("id", id);

  const res = await req.query(`
    DELETE FROM Mallas_DB_Certificados
    OUTPUT DELETED.imagen
    WHERE id = @id;
  `);

  if (res.recordset.length === 0) {
    return { id, eliminado: false, imagen: null };
  }

  const imagen = res.recordset[0].imagen
    ? String(res.recordset[0].imagen)
    : null;

  return { id, eliminado: true, imagen };
}

// --- SELECTOR Y PREVISUALIZACIÓN ---
export interface CertificadoOpcion {
  id: number;
  certificado: string;
  imagen: string | null;
}

/**
 * Devuelve los certificados disponibles para alimentar el selector del
 * formulario de mallas.
 */
export async function listarCertificadosOpcionesService(
  pool: ConnectionPool
): Promise<CertificadoOpcion[]> {
  const req = pool.request();

  const resultado = await req.query(`
    SELECT id, certificado, imagen
    FROM Mallas_DB_Certificados
    ORDER BY certificado ASC;
  `);

  return resultado.recordset.map((row) => ({
    id: Number(row.id),
    certificado: row.certificado != null ? String(row.certificado) : "",
    imagen: row.imagen ? String(row.imagen) : null,
  }));
}

/**
 * Obtiene el certificado asociado a una malla (por su certificado_id) para
 * resolver la ruta de la imagen que se previsualiza en el formulario.
 */
export async function obtenerCertificadoImagenService(
  pool: ConnectionPool,
  id: number
): Promise<CertificadoOpcion | null> {
  const req = pool.request();
  req.input("id", id);

  const resultado = await req.query(`
    SELECT id, certificado, imagen
    FROM Mallas_DB_Certificados
    WHERE id = @id;
  `);

  if (resultado.recordset.length === 0) return null;

  const row = resultado.recordset[0];

  return {
    id: Number(row.id),
    certificado: row.certificado != null ? String(row.certificado) : "",
    imagen: row.imagen ? String(row.imagen) : null,
  };
}
