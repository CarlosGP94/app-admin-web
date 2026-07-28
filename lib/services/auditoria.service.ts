import { ConnectionPool, Request, Transaction } from "mssql";

// Interfaces de Entrada y Salida
export interface AsignarAuditoriaPayload {
  flejesIds: string[];
  bobinaId: string;
  coladaId: string;
}

export interface AsignarAuditoriaResultado {
  colada_id: number;
  flejesProcesados: number;
  auditoriasCreadas: number;
  auditoriasActualizadas: number;
}

/**
 * Servicio para gestionar la asignación de Coladas y Auditorías a partir de Flejes y Bobina.
 */
export async function asignarAuditoriaBobinaService(
  pool: ConnectionPool,
  payload: AsignarAuditoriaPayload,
): Promise<AsignarAuditoriaResultado> {
  const { flejesIds, bobinaId, coladaId } = payload;
  const transaction = new Transaction(pool);

  try {
    await transaction.begin();

    // ------------------------------------------------------------------------
    // PASO 1: Obtener o crear el colada_id en la tabla Bobina_Coladas
    // ------------------------------------------------------------------------
    let finalColadaId: number;

    const reqBuscarColada = new Request(transaction);
    reqBuscarColada.input("coladaId", coladaId);

    const queryBuscarColada = `
      SELECT id 
      FROM Bobina_Coladas 
      WHERE colada = @coladaId;
    `;

    const resBuscarColada = await reqBuscarColada.query(queryBuscarColada);

    if (resBuscarColada.recordset.length > 0) {
      // Caso 1.1: La colada existe
      finalColadaId = resBuscarColada.recordset[0].id;
    } else {
      // Caso 1.2: No existe -> Buscar fabricante_id en la tabla Bobinas
      const reqBuscarBobina = new Request(transaction);
      reqBuscarBobina.input("bobinaId", bobinaId);

      const queryBuscarBobina = `
        SELECT fabricante_id 
        FROM Bobinas 
        WHERE id = @bobinaId;
      `;

      const resBuscarBobina = await reqBuscarBobina.query(queryBuscarBobina);

      if (resBuscarBobina.recordset.length === 0) {
        throw new Error(`No se encontró la bobina con ID: ${bobinaId}`);
      }

      const fabricanteId = resBuscarBobina.recordset[0].fabricante_id;

      // Insertar nueva colada en Bobina_Coladas
      const reqInsertColada = new Request(transaction);
      reqInsertColada.input("colada", coladaId);
      reqInsertColada.input("fabricante_id", fabricanteId);

      const queryInsertColada = `
        INSERT INTO Bobina_Coladas (colada, fabricante_id)
        OUTPUT INSERTED.id
        VALUES (@colada, @fabricante_id);
      `;

      const resInsertColada = await reqInsertColada.query(queryInsertColada);
      finalColadaId = resInsertColada.recordset[0].id;
    }

    // ------------------------------------------------------------------------
    // PASO 2: Procesar cada fleje y actualizar/crear su registro de Auditoría
    // ------------------------------------------------------------------------
    let auditoriasCreadas = 0;
    let auditoriasActualizadas = 0;

    for (const flejeId of flejesIds) {
      // 2.1 Buscar auditoria_id en Lotes_Flejes
      const reqFleje = new Request(transaction);
      reqFleje.input("flejeId", flejeId);

      const queryFleje = `
        SELECT auditoria_id 
        FROM Lotes_Flejes 
        WHERE id = @flejeId;
      `;

      const resFleje = await reqFleje.query(queryFleje);

      if (resFleje.recordset.length === 0) {
        throw new Error(`No se encontró el Lote_Fleje con ID: ${flejeId}`);
      }

      const auditoriaId = resFleje.recordset[0].auditoria_id;

      if (auditoriaId !== null && auditoriaId !== undefined) {
        // 2.2 Si EXISTE auditoria_id -> Editar Auditoria_Bobinas
        const reqUpdateAuditoria = new Request(transaction);
        reqUpdateAuditoria.input("id", auditoriaId);
        reqUpdateAuditoria.input("bobina_id", bobinaId);
        reqUpdateAuditoria.input("colada_id", finalColadaId);

        const queryUpdateAuditoria = `
          UPDATE Auditoria_Bobinas
          SET bobina_id = @bobina_id,
              colada_id = @colada_id
          WHERE id = @id;
        `;

        await reqUpdateAuditoria.query(queryUpdateAuditoria);
        auditoriasActualizadas++;
      } else {
        // 2.3 Si auditoria_id es NULL -> Crear Auditoria_Bobinas y actualizar Lotes_Flejes
        const reqInsertAuditoria = new Request(transaction);
        reqInsertAuditoria.input("bobina_id", bobinaId);
        reqInsertAuditoria.input("colada_id", finalColadaId);

        const queryInsertAuditoria = `
          INSERT INTO Auditoria_Bobinas (bobina_id, colada_id)
          OUTPUT INSERTED.id
          VALUES (@bobina_id, @colada_id);
        `;

        const resInsertAuditoria =
          await reqInsertAuditoria.query(queryInsertAuditoria);
        const nuevaAuditoriaId = resInsertAuditoria.recordset[0].id;

        // Actualizar el Lote_Fleje con el nuevo ID de auditoría
        const reqUpdateFleje = new Request(transaction);
        reqUpdateFleje.input("flejeId", flejeId);
        reqUpdateFleje.input("auditoria_id", nuevaAuditoriaId);

        const queryUpdateFleje = `
          UPDATE Lotes_Flejes
          SET auditoria_id = @auditoria_id
          WHERE id = @flejeId;
        `;

        await reqUpdateFleje.query(queryUpdateFleje);
        auditoriasCreadas++;
      }
    }

    // ------------------------------------------------------------------------
    // PASO 3: Confirmar transacción y retornar resultados
    // ------------------------------------------------------------------------
    await transaction.commit();

    return {
      colada_id: finalColadaId,
      flejesProcesados: flejesIds.length,
      auditoriasCreadas,
      auditoriasActualizadas,
    };
  } catch (error) {
    // Si algo falla, revertimos cualquier cambio efectuado
    await transaction.rollback();
    throw error;
  }
}
