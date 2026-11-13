import { ConnectionPool } from "mssql";
import * as ExcelJS from "exceljs";

export interface GenerarExcelProduccionMallasParams {
  maquina_ids?: number[];
  diametros?: number[];
  fechaInicio?: string;
  fechaFin?: string;
}

export class SinDatosProduccionError extends Error {
  constructor() {
    super("No hay registros de producción para los filtros seleccionados.");
    this.name = "SinDatosProduccionError";
  }
}

function formatFecha(value: Date | string | null): string {
  if (!value) return "";

  const fecha = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(fecha.getTime())) return "";

  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const anio = fecha.getFullYear();
  const hora = String(fecha.getHours()).padStart(2, "0");
  const minuto = String(fecha.getMinutes()).padStart(2, "0");

  return `${dia}-${mes}-${anio} ${hora}:${minuto}`;
}

export async function generarExcelProduccionMallasService(
  pool: ConnectionPool,
  params: GenerarExcelProduccionMallasParams = {}
): Promise<Buffer> {
  const { maquina_ids, diametros, fechaInicio, fechaFin } = params;
  const req = pool.request();

  let whereClauses = "WHERE 1=1";

  if (maquina_ids && maquina_ids.length > 0) {
    const placeholders = maquina_ids.map((id, index) => {
      const paramName = `maquinaId${index}`;
      req.input(paramName, id);
      return `@${paramName}`;
    });

    whereClauses += ` AND p.maquina_id IN (${placeholders.join(", ")})`;
  }

  if (diametros && diametros.length > 0) {
    const placeholders = diametros.map((diametro, index) => {
      const paramName = `diametro${index}`;
      req.input(paramName, diametro);
      return `@${paramName}`;
    });

    whereClauses += ` AND p.diametro IN (${placeholders.join(", ")})`;
  }

  if (fechaInicio && fechaFin) {
    whereClauses +=
      " AND p.creado >= @fechaInicio AND p.creado < DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaInicio", fechaInicio);
    req.input("fechaFin", fechaFin);
  } else if (fechaInicio) {
    whereClauses += " AND p.creado >= @fechaInicio";
    req.input("fechaInicio", fechaInicio);
  } else if (fechaFin) {
    whereClauses +=
      " AND p.creado < DATEADD(day, 1, CAST(@fechaFin AS DATETIME2))";
    req.input("fechaFin", fechaFin);
  }

  const query = `
    SELECT
      p.id,
      p.creado,
      p.turno_id,
      t.prefijo AS turno_prefijo,
      p.maquina_id,
      mq.nombre AS maquina_nombre,
      mq.maquina AS maquina_codigo,
      p.lote,
      p.paquete,
      p.unidades,
      p.malla_id,
      m.codigo AS malla_codigo,
      m.designacion AS malla_designacion,
      p.diametro,
      p.ancho,
      p.largo,
      p.sl,
      p.st,
      p.longitudinales,
      p.transversales,
      p.observacion,
      p.impreso
    FROM Mallas_DB_Produccion p
    LEFT JOIN Maquinas mq ON p.maquina_id = mq.id
    LEFT JOIN Mallas_DB_Mallas m ON p.malla_id = m.id
    LEFT JOIN Turnos t ON p.turno_id = t.id
    ${whereClauses}
    ORDER BY p.creado DESC, p.id DESC;
  `;

  const resultado = await req.query(query);
  const rows = resultado.recordset;

  if (rows.length === 0) {
    throw new SinDatosProduccionError();
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Producción Mallas");

  worksheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Fecha", key: "creado", width: 20 },
    { header: "Turno", key: "turno", width: 12 },
    { header: "Máquina", key: "maquina", width: 22 },
    { header: "Lote", key: "lote", width: 18 },
    { header: "Paquete", key: "paquete", width: 12 },
    { header: "Unidades", key: "unidades", width: 12 },
    { header: "Código malla", key: "malla_codigo", width: 18 },
    { header: "Designación", key: "malla_designacion", width: 24 },
    { header: "Diámetro", key: "diametro", width: 12 },
    { header: "Ancho", key: "ancho", width: 12 },
    { header: "Largo", key: "largo", width: 12 },
    { header: "SL", key: "sl", width: 10 },
    { header: "ST", key: "st", width: 10 },
    { header: "Longitudinales", key: "longitudinales", width: 16 },
    { header: "Transversales", key: "transversales", width: 16 },
    { header: "Observación", key: "observacion", width: 30 },
    { header: "Impreso", key: "impreso", width: 10 },
  ];

  worksheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    worksheet.addRow({
      id: Number(row.id),
      creado: formatFecha(row.creado),
      turno: row.turno_prefijo ?? "-",
      maquina: row.maquina_nombre ?? row.maquina_codigo ?? "-",
      lote: row.lote ?? "-",
      paquete: row.paquete ?? 0,
      unidades: row.unidades ?? 0,
      malla_codigo: row.malla_codigo ?? "-",
      malla_designacion: row.malla_designacion ?? "-",
      diametro: row.diametro ?? 0,
      ancho: row.ancho ?? 0,
      largo: row.largo ?? 0,
      sl: row.sl ?? 0,
      st: row.st ?? 0,
      longitudinales: row.longitudinales ?? 0,
      transversales: row.transversales ?? 0,
      observacion: row.observacion ?? "",
      impreso: row.impreso ? "Sí" : "No",
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
