import { ConnectionPool, Request, Transaction } from "mssql";

export interface FiltrosPlantillas {
  buscar?: string;
}

export interface ListarPlantillasParams {
  page?: number;
  pageSize?: number;
  orderBy?: "nombre" | "titulo" | "creado";
  orderDir?: "ASC" | "DESC";
  filtros?: FiltrosPlantillas;
}

export interface PlantillaRow {
  id: number;
  tipo: string;
  numero_varillas: string;
  peso: string;
  unidades_paquetes: string;
  lote: string;
  numero_paquetes: string;
  nombre: string;
  titulo: string;
  creado: string;
}

export interface ListarPlantillasResponse {
  data: PlantillaRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Servicio para listar, paginar, ordenar y filtrar las Plantillas
 */
export async function listarPlantillasService(
  pool: ConnectionPool,
  params: ListarPlantillasParams
): Promise<ListarPlantillasResponse> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize =
    params.pageSize && params.pageSize > 0 ? params.pageSize : 10;

  const rowStart = (page - 1) * pageSize + 1;
  const rowEnd = page * pageSize;

  const { filtros, orderBy, orderDir = "ASC" } = params;
  const req = pool.request();

  let whereClauses = "WHERE 1=1";

  if (filtros?.buscar) {
    whereClauses += " AND (p.nombre LIKE @buscar OR p.titulo LIKE @buscar)";
    req.input("buscar", `%${filtros.buscar}%`);
  }

  let safeOrderBySql = "";

  if (orderBy) {
    const columnasPermitidas = {
      nombre: "p.nombre",
      titulo: "p.titulo",
      creado: "p.creado",
    };
    const dir = orderDir.toUpperCase() === "DESC" ? "DESC" : "ASC";
    safeOrderBySql = `${columnasPermitidas[orderBy]} ${dir}`;
  } else {
    safeOrderBySql = "p.id DESC";
  }

  const query = `
    WITH PlantillasPaginadas AS (
        SELECT
            p.id,
            p.tipo,
            p.numero_varillas,
            p.peso,
            p.unidades_paquetes,
            p.lote,
            p.numero_paquetes,
            p.nombre,
            p.titulo,
            p.creado,
            ROW_NUMBER() OVER (ORDER BY ${safeOrderBySql}) AS RowNum,
            COUNT(*) OVER() AS TotalCount
        FROM Mallas_DB_Plantillas p
        ${whereClauses}
    )
    SELECT *
    FROM PlantillasPaginadas
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
      tipo: row.tipo,
      numero_varillas: row.numero_varillas,
      peso: row.peso,
      unidades_paquetes: row.unidades_paquetes,
      lote: row.lote,
      numero_paquetes: row.numero_paquetes,
      nombre: row.nombre,
      titulo: row.titulo,
      creado: row.creado ? new Date(row.creado).toISOString() : "",
    })),
    total,
    page,
    pageSize,
  };
}

export interface PlantillaCreatePayload {
  tipo: string;
  numero_varillas: string;
  peso: string;
  unidades_paquetes: string;
  lote: string;
  numero_paquetes: string;
  nombre: string;
  titulo: string;
}

export interface PlantillaCreateResponse {
  id: number;
  nombre: string;
  titulo: string;
}

/**
 * Servicio para crear una nueva plantilla.
 */
export async function crearPlantillaService(
  pool: ConnectionPool,
  payload: PlantillaCreatePayload
): Promise<PlantillaCreateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const reqPlantilla = new Request(transaction);

    reqPlantilla.input("tipo", payload.tipo.trim());
    reqPlantilla.input("numero_varillas", payload.numero_varillas.trim());
    reqPlantilla.input("peso", payload.peso.trim());
    reqPlantilla.input("unidades_paquetes", payload.unidades_paquetes.trim());
    reqPlantilla.input("lote", payload.lote.trim());
    reqPlantilla.input("numero_paquetes", payload.numero_paquetes.trim());
    reqPlantilla.input("nombre", payload.nombre.trim());
    reqPlantilla.input("titulo", payload.titulo.trim());

    const queryInsert = `
      INSERT INTO Mallas_DB_Plantillas (
        tipo, numero_varillas, peso, unidades_paquetes,
        lote, numero_paquetes, nombre, titulo, creado
      )
      OUTPUT INSERTED.id
      VALUES (
        @tipo, @numero_varillas, @peso, @unidades_paquetes,
        @lote, @numero_paquetes, @nombre, @titulo, GETDATE()
      );
    `;

    const res = await reqPlantilla.query(queryInsert);
    const nuevaId = res.recordset[0].id;

    await transaction.commit();

    return {
      id: nuevaId,
      nombre: payload.nombre.trim(),
      titulo: payload.titulo.trim(),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export interface PlantillaUpdatePayload extends PlantillaCreatePayload {
  id: number;
}

export interface PlantillaUpdateResponse {
  id: number;
  nombre: string;
  titulo: string;
}

/**
 * Servicio para actualizar una plantilla existente.
 */
export async function actualizarPlantillaService(
  pool: ConnectionPool,
  payload: PlantillaUpdatePayload
): Promise<PlantillaUpdateResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const reqPlantilla = new Request(transaction);
    reqPlantilla.input("id", payload.id);
    reqPlantilla.input("tipo", payload.tipo.trim());
    reqPlantilla.input("numero_varillas", payload.numero_varillas.trim());
    reqPlantilla.input("peso", payload.peso.trim());
    reqPlantilla.input("unidades_paquetes", payload.unidades_paquetes.trim());
    reqPlantilla.input("lote", payload.lote.trim());
    reqPlantilla.input("numero_paquetes", payload.numero_paquetes.trim());
    reqPlantilla.input("nombre", payload.nombre.trim());
    reqPlantilla.input("titulo", payload.titulo.trim());

    const queryUpdate = `
      UPDATE Mallas_DB_Plantillas
      SET 
        tipo = @tipo,
        numero_varillas = @numero_varillas,
        peso = @peso,
        unidades_paquetes = @unidades_paquetes,
        lote = @lote,
        numero_paquetes = @numero_paquetes,
        nombre = @nombre,
        titulo = @titulo
      WHERE id = @id;
    `;

    await reqPlantilla.query(queryUpdate);

    await transaction.commit();

    return {
      id: payload.id,
      nombre: payload.nombre.trim(),
      titulo: payload.titulo.trim(),
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Servicio para obtener una plantilla específica por su ID.
 */
export async function obtenerPlantillaPorIdService(
  pool: ConnectionPool,
  id: number
): Promise<PlantillaRow | null> {
  const req = pool.request();
  req.input("id", id);

  const query = `
    SELECT 
      id, tipo, numero_varillas, peso, unidades_paquetes,
      lote, numero_paquetes, nombre, titulo, creado
    FROM Mallas_DB_Plantillas
    WHERE id = @id;
  `;

  const resultado = await req.query(query);
  if (resultado.recordset.length === 0) {
    return null;
  }

  const row = resultado.recordset[0];

  return {
    id: row.id,
    tipo: row.tipo,
    numero_varillas: row.numero_varillas,
    peso: row.peso,
    unidades_paquetes: row.unidades_paquetes,
    lote: row.lote,
    numero_paquetes: row.numero_paquetes,
    nombre: row.nombre,
    titulo: row.titulo,
    creado: row.creado ? new Date(row.creado).toISOString() : "",
  };
}

export interface PlantillaDeleteResponse {
  id: number;
  eliminado: boolean;
}

/**
 * Servicio para eliminar una plantilla por su ID.
 */
export async function eliminarPlantillaService(
  pool: ConnectionPool,
  id: number
): Promise<PlantillaDeleteResponse> {
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    const reqDelete = new Request(transaction);
    reqDelete.input("id", id);

    const queryDelete = `
      DELETE FROM Mallas_DB_Plantillas 
      WHERE id = @id;
    `;

    const res = await reqDelete.query(queryDelete);
    const eliminado = (res.rowsAffected[0] || 0) > 0;

    if (!eliminado) {
      await transaction.rollback();
      return {
        id,
        eliminado: false,
      };
    }

    await transaction.commit();

    return {
      id,
      eliminado: true,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
