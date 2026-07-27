import { ConnectionPool, Request } from "mssql";

// Tipo para el control dimensional completo con la máquina y el tubo anidados/mapeados
export interface ControlDimensionalDetalle {
  id: number;
  creado: Date;
  maquina_id: number;
  medida_de: number;
  medida_hb: number;
  medida_espesor: number;
  medida_conv: number;
  medida_rectang: number;
  medida_redondeo: number;
  medida_revirado_alt: number;
  medida_rectitud: number;
  medida_long: number;
  medida_revirado_base: number;
  tubo_id: number;
  medida_va: number;
  // Relación con la tabla Maquinas
  maquina?: {
    id: number;
    nombre?: string;
    [key: string]: unknown;
  };
  // Relación con la tabla Tubos
  tubo?: {
    id: number;
    espesor: number;
    ancho: number;
    alto: number;
    diametro: number;
    longitud: number;
    calidad_id: number;
  };
}

/**
 * Servicio para obtener un control dimensional a partir del ID de Prod_Tubos,
 * uniendo Prod_Tubos -> Control_Dimensional -> Maquinas y Tubos en una sola consulta.
 */
export async function getControlDimensionalByProdTuboIdService(
  pool: ConnectionPool,
  prodTuboId: number,
): Promise<ControlDimensionalDetalle> {
  const req = pool.request();
  req.input("prodTuboId", prodTuboId);
  console.log(
    "Ejecutando consulta para obtener control dimensional del Prod_Tubo ID:",
    prodTuboId,
  );
  const query = `
    SELECT 
      -- Campos del Control Dimensional
      cd.id,
      cd.creado,
      cd.maquina_id,
      cd.medida_de,
      cd.medida_hb,
      cd.medida_espesor,
      cd.medida_conv,
      cd.medida_rectang,
      cd.medida_redondeo,
      cd.medida_revirado_alt,
      cd.medida_rectitud,
      cd.medida_long,
      cd.medida_revirado_base,
      cd.tubo_id,
      cd.medida_va,

      -- Campos de la tabla Maquinas
      m.id AS maquina_id_ref,
      m.nombre AS maquina_nombre,

      -- Campos específicos de la tabla Tubos
      t.id AS tubo_id_ref,
      t.espesor AS tubo_espesor,
      t.ancho AS tubo_ancho,
      t.alto AS tubo_alto,
      t.diametro AS tubo_diametro,
      t.longitud AS tubo_longitud,
      t.calidad_id AS tubo_calidad_id

    FROM Prod_Tubos pt
    INNER JOIN Control_Dimensional cd ON pt.control_dimensional_id = cd.id
    LEFT JOIN Maquinas m ON cd.maquina_id = m.id
    LEFT JOIN Tubos t ON cd.tubo_id = t.id
    WHERE pt.id = @prodTuboId;
  `;

  const resultado = await req.query(query);

  if (resultado.recordset.length === 0) {
    throw new Error(
      "No se encontró un control dimensional asociado a esta orden de producción.",
    );
  }

  const row = resultado.recordset[0];

  return {
    id: row.id,
    creado: row.creado,
    maquina_id: row.maquina_id,
    medida_de: Number(row.medida_de),
    medida_hb: Number(row.medida_hb),
    medida_espesor: Number(row.medida_espesor),
    medida_conv: Number(row.medida_conv),
    medida_rectang: Number(row.medida_rectang),
    medida_redondeo: Number(row.medida_redondeo),
    medida_revirado_alt: Number(row.medida_revirado_alt),
    medida_rectitud: Number(row.medida_rectitud),
    medida_long: Number(row.medida_long),
    medida_revirado_base: Number(row.medida_revirado_base),
    tubo_id: row.tubo_id,
    medida_va: Number(row.medida_va),

    // Objeto anidado para Máquina
    maquina: row.maquina_id_ref
      ? {
          id: row.maquina_id_ref,
          nombre: row.maquina_nombre || undefined,
        }
      : undefined,

    // Objeto anidado para Tubo
    tubo: row.tubo_id_ref
      ? {
          id: row.tubo_id_ref,
          espesor: Number(row.tubo_espesor),
          ancho: Number(row.tubo_ancho),
          alto: Number(row.tubo_alto),
          diametro: Number(row.tubo_diametro),
          longitud: Number(row.tubo_longitud),
          calidad_id: Number(row.tubo_calidad_id),
        }
      : undefined,
  };
}

// Interface para el payload de actualización recibida desde el frontend
export interface ControlDimensionalUpdatePayload {
  id: number;
  fecha?: string;
  maquina_id: number;
  calidad_id?: number;
  tubo_id: number;
  medida_de: number;
  medida_va: number;
  medida_hb: number;
  medida_espesor: number;
  medida_conv: number;
  medida_rectang: number;
  medida_redondeo: number;
  medida_revirado_alt: number;
  medida_revirado_base: number;
  medida_rectitud: number;
  medida_long: number;
}

// Interface para la respuesta del servicio
export interface ControlDimensionalUpdateResponse {
  id: number;
  success: boolean;
  message: string;
}

/**
 * Servicio para actualizar un registro de Control Dimensional en la base de datos SQL Server.
 */
export async function actualizarControlDimensionalService(
  pool: ConnectionPool,
  payload: ControlDimensionalUpdatePayload,
): Promise<ControlDimensionalUpdateResponse> {
  if (!payload.id) {
    throw new Error(
      "El ID del control dimensional es obligatorio para realizar la actualización.",
    );
  }

  const req = new Request(pool);

  // Mapeo de Parámetros SQL
  req.input("id", payload.id);
  req.input("maquina_id", payload.maquina_id);
  req.input("tubo_id", payload.tubo_id);

  // Manejo flexible de la fecha recibida
  const fechaValor = payload.fecha ? new Date(payload.fecha) : new Date();
  req.input("creado", fechaValor);

  // Cotas y medidas dimensionales
  req.input("medida_de", payload.medida_de);
  req.input("medida_va", payload.medida_va);
  req.input("medida_hb", payload.medida_hb);
  req.input("medida_espesor", payload.medida_espesor);
  req.input("medida_conv", payload.medida_conv);
  req.input("medida_rectang", payload.medida_rectang);
  req.input("medida_redondeo", payload.medida_redondeo);
  req.input("medida_revirado_alt", payload.medida_revirado_alt);
  req.input("medida_revirado_base", payload.medida_revirado_base);
  req.input("medida_rectitud", payload.medida_rectitud);
  req.input("medida_long", payload.medida_long);

  const queryUpdate = `
    UPDATE Control_Dimensional
    SET 
      creado = @creado,
      maquina_id = @maquina_id,
      tubo_id = @tubo_id,
      medida_de = @medida_de,
      medida_va = @medida_va,
      medida_hb = @medida_hb,
      medida_espesor = @medida_espesor,
      medida_conv = @medida_conv,
      medida_rectang = @medida_rectang,
      medida_redondeo = @medida_redondeo,
      medida_revirado_alt = @medida_revirado_alt,
      medida_revirado_base = @medida_revirado_base,
      medida_rectitud = @medida_rectitud,
      medida_long = @medida_long
    WHERE id = @id;
  `;

  const result = await req.query(queryUpdate);

  if (result.rowsAffected[0] === 0) {
    throw new Error(
      `No se encontró ningún registro en Control_Dimensional con el ID ${payload.id}.`,
    );
  }

  return {
    id: payload.id,
    success: true,
    message: "Control dimensional actualizado correctamente",
  };
}
