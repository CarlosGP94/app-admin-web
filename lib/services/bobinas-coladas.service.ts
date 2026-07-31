import { Request } from "mssql";
import type { ConnectionPool } from "mssql";

// --- Interfaces para Bobina Coladas ---

export interface BobinaColadaItem {
  id: number;
  colada: string;
  peso?: number;
  creado?: Date | string;
  [key: string]: unknown;
}

export interface ListarBobinasColadasParams {
  bobinaId: number;
}

/**
 * Servicio para listar las bobinas coladas asociadas a un ID de bobina
 * a través de la tabla intermedia Bobinas_Cortadas (usando colada_id).
 */
export async function listarBobinasColadasPorBobinaIdService(
  pool: ConnectionPool,
  params: ListarBobinasColadasParams
): Promise<BobinaColadaItem[]> {
  const { bobinaId } = params;

  if (!bobinaId || isNaN(bobinaId)) {
    throw new Error(
      "El id de la bobina es requerido y debe ser un número válido."
    );
  }

  const request = pool.request();
  request.input("bobinaId", bobinaId);

  const query = `
    SELECT DISTINCT
      bc.id,
      bc.colada,
      bc.creado
    FROM Bobina_Coladas bc
    INNER JOIN Bobinas_Cortadas bcort ON bcort.colada_id = bc.id
    WHERE bcort.bobina_id = @bobinaId
    ORDER BY bc.id DESC;
  `;

  const result = await request.query(query);

  return result.recordset.map((row) => ({
    id: row.id,
    colada: row.colada || "",
    peso:
      row.peso !== null && row.peso !== undefined
        ? Number(row.peso)
        : undefined,
    creado: row.creado ? new Date(row.creado).toISOString() : undefined,
  }));
}

// --- Interfaces para Seleccionar Coladas ---

export interface BobinaColadaSeleccionableItem {
  id: number;
  colada: string;
  fabricante_id?: number;
  peso?: number;
  creado?: Date | string;
  [key: string]: unknown;
}

export interface ListarColadasParaSeleccionarParams {
  fabricanteId: number;
}

/**
 * Servicio para listar las coladas pertenecientes a un fabricante específico,
 * destinadas a ser mostradas en controles de selección (dropdowns, autocompletes, etc.).
 */
export async function listarColadasParaSeleccionarService(
  pool: ConnectionPool,
  params: ListarColadasParaSeleccionarParams
): Promise<BobinaColadaSeleccionableItem[]> {
  const { fabricanteId } = params;

  if (!fabricanteId || isNaN(fabricanteId)) {
    throw new Error(
      "El id del fabricante es requerido y debe ser un número válido."
    );
  }

  const request = pool.request();
  request.input("fabricanteId", fabricanteId);

  const query = `
    SELECT DISTINCT
      bc.id,
      bc.colada,
      bc.fabricante_id,
      bc.creado
    FROM Bobina_Coladas bc
    WHERE bc.fabricante_id = @fabricanteId
    ORDER BY bc.colada ASC;
  `;

  const result = await request.query(query);

  return result.recordset.map((row) => ({
    id: row.id,
    colada: row.colada || "",
    fabricante_id:
      row.fabricante_id !== null && row.fabricante_id !== undefined
        ? Number(row.fabricante_id)
        : undefined,
    peso:
      row.peso !== null && row.peso !== undefined
        ? Number(row.peso)
        : undefined,
    creado: row.creado ? new Date(row.creado).toISOString() : undefined,
  }));
}
