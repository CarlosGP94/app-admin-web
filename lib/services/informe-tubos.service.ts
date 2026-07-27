import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { ConnectionPool, Int } from "mssql";
import { getConnection } from "@/lib/db";

export interface TuboReportRow {
  calidad_id?: number;
  calidad?: string;
  medida?: string;
  unidades?: number;
  paquetes?: number;
  peso?: number;
}

export interface InformeTubosOptions {
  ids?: number[];
  path?: string;
}

interface InformeFilaSegura extends TuboReportRow {
  isQualityHeader?: boolean;
  isSubtotal?: boolean;
}

// Configuración de filas por página ajustada exactamente a 28 líneas
const ROWS_PER_PAGE_TEMPLATE = 28;

function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPeso(pesoInKg: number | null | undefined): string {
  if (pesoInKg == null || isNaN(pesoInKg)) return "0.00 Kg";
  const toneladas = pesoInKg / 1000;
  return `${toneladas.toFixed(2)} Kg`;
}

/**
 * Regla personalizada para formatear el número de paquetes:
 * - 4   -> 4
 * - 4.2 -> 4
 * - 5.4 -> 6
 */
function formatPaquetes(val: number | null | undefined): number {
  if (val == null || isNaN(val)) return 0;

  const entero = Math.floor(val);
  const decimal = val - entero;

  if (decimal > 0.2) {
    return entero + 1;
  }

  return entero;
}

/**
 * Obtiene los datos de tubos desde la base de datos
 */
async function obtenerDatosInforme(
  pool: ConnectionPool,
  ids?: number[],
): Promise<TuboReportRow[]> {
  const request = pool.request();
  const whereClauses: string[] = ["t.activo = 1", "t.unidades > 0"];

  if (ids && ids.length > 0) {
    const paramNames = ids.map((id, index) => {
      const paramName = `id${index}`;
      request.input(paramName, Int, id);
      return `@${paramName}`;
    });
    whereClauses.push(`t.id IN (${paramNames.join(", ")})`);
  }

  const query = `
    SELECT 
      tc.id AS calidad_id,
      ISNULL(tc.nombre, 'Sin Calidad') AS calidad,
      ISNULL(t.art_concepto, '-') AS medida,
      ISNULL(t.unidades, 0) AS unidades,
      ISNULL(t.num_paquetes, 0) AS paquetes,
      ISNULL(t.peso_total, 0) AS peso
    FROM Tubos t
    LEFT JOIN Tipos_Calidad tc ON t.calidad_id = tc.id
    LEFT JOIN Tipos_Tubos tt ON t.tipo_id = tt.id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY 
      tc.nombre ASC,
      t.espesor ASC,
      tt.nombre ASC,
      t.ancho ASC,
      t.alto ASC,
      t.diametro ASC,
      t.medida ASC;
  `;

  const result = await request.query(query);
  return (result.recordset as TuboReportRow[]) || [];
}

/**
 * Genera el documento HTML completo listo para convertir a PDF
 */
function generarHtmlInforme(reportRows: TuboReportRow[]): string {
  let safeRows: InformeFilaSegura[] = [];

  // 1. Agrupación por Calidad y cálculo de subtotales
  if (reportRows.length) {
    const groups = new Map<
      string,
      { calidad: string; rows: TuboReportRow[] }
    >();

    for (const r of reportRows) {
      const key = r.calidad_id != null ? String(r.calidad_id) : "__null__";
      if (!groups.has(key)) {
        groups.set(key, { calidad: r.calidad || "N/A", rows: [] });
      }
      groups.get(key)!.rows.push(r);
    }

    for (const [, group] of groups) {
      safeRows.push({
        isQualityHeader: true,
        calidad: group.calidad,
      });

      for (const r of group.rows) {
        safeRows.push(r);
      }

      const subtotalUnidades = group.rows.reduce(
        (acc, row) => acc + Number(row.unidades || 0),
        0,
      );
      const subtotalPaquetes = group.rows.reduce(
        (acc, row) => acc + Number(row.paquetes || 0),
        0,
      );
      const subtotalPeso = group.rows.reduce(
        (acc, row) => acc + Number(row.peso || 0),
        0,
      );

      safeRows.push({
        isSubtotal: true,
        calidad: group.calidad,
        medida: "",
        unidades: subtotalUnidades,
        paquetes: subtotalPaquetes,
        peso: subtotalPeso,
      });
    }
  } else {
    safeRows = [
      { isQualityHeader: true, calidad: "Sin datos" },
      { calidad: "Sin datos", medida: "-", unidades: 0, paquetes: 0, peso: 0 },
    ];
  }

  // 2. Totales generales
  const totalUnidades = reportRows.reduce(
    (acc, row) => acc + Number(row.unidades || 0),
    0,
  );
  const totalPaquetes = reportRows.reduce(
    (acc, row) => acc + Number(row.paquetes || 0),
    0,
  );
  const totalPeso = reportRows.reduce(
    (acc, row) => acc + Number(row.peso || 0),
    0,
  );

  // 3. Paginar controlando el peso de cada elemento
  const pages: InformeFilaSegura[][] = [];
  let currentPage: InformeFilaSegura[] = [];
  let currentWeight = 0;

  for (const row of safeRows) {
    let rowWeight = 1;
    if (row.isSubtotal) {
      rowWeight = 2; // Representa el subtotal + espaciado visual
    } else if (row.isQualityHeader) {
      rowWeight = 1;
    }

    if (
      currentWeight + rowWeight > ROWS_PER_PAGE_TEMPLATE &&
      currentPage.length > 0
    ) {
      pages.push(currentPage);
      currentPage = [];
      currentWeight = 0;
    }

    currentPage.push(row);
    currentWeight += rowWeight;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  const totalPages = Math.max(1, pages.length);
  const fechaFooter = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // 4. Construcción de secciones por página HTML
  const pagesHtml = pages
    .map((pageRows, pageIndex) => {
      const rowsHtml = pageRows
        .map((row) => {
          if (row.isQualityHeader) {
            return `
              <tr class="quality-header-row">
                <td colspan="4" style="font-size: 16px; font-style: italic; font-weight: 700; border-bottom: 2px solid #000080; color: #000080; padding-top: 12px; padding-bottom: 4px;">
                  Calidad: ${escapeHtml(row.calidad)}
                </td>
              </tr>`;
          }

          if (row.isSubtotal) {
            return `
              <tr class="subtotal-spacer">
                <td colspan="4" style="height: 4px; padding: 0; border: none;"></td>
              </tr>
              <tr class="subtotal-row" style="font-weight: 700; background: #f4f4f4; color: #000080; font-size: 14px;">
                <td class="text-left" style="padding: 8px 0;">Subtotal de ${escapeHtml(row.calidad)}</td>
                <td class="text-right" style="padding: 8px 0;">${row.unidades}</td>
                <td class="text-right" style="padding: 8px 0;">${formatPaquetes(row.paquetes)}</td>
                <td class="text-right" style="padding: 8px 0;">${formatPeso(row.peso)}</td>
              </tr>
              <tr class="subtotal-spacer">
                <td colspan="4" style="height: 6px; padding: 0; border: none;"></td>
              </tr>`;
          }

          return `
            <tr>
              <td class="text-left">${escapeHtml(row.medida)}</td>
              <td class="text-right">${row.unidades}</td>
              <td class="text-right">${formatPaquetes(row.paquetes)}</td>
              <td class="text-right">${formatPeso(row.peso)}</td>
            </tr>`;
        })
        .join("");

      const showTotals = pageIndex === totalPages - 1;
      const pageBreakStyle =
        pageIndex === totalPages - 1
          ? ""
          : "page-break-after: always; break-after: page;";

      return `
        <section class="pdf-page" style="min-height: 270mm; display: flex; flex-direction: column; box-sizing: border-box; ${pageBreakStyle}">
          <div class="header">
            <h1>Inventario de Tubos en Dos Hermanas</h1>
          </div>

          <table style="margin-bottom: 14px; width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th class="text-left" style="width: 45%">Medida</th>
                <th class="text-right" style="width: 18%">Unidades</th>
                <th class="text-right" style="width: 18%">Paquetes</th>
                <th class="text-right" style="width: 19%">Peso (Kg)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          ${
            showTotals
              ? `
              <div style="margin-top: auto; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tfoot>
                    <tr class="grand-total">
                      <td class="text-left" style="width: 45%">Total general</td>
                      <td class="text-right" style="width: 18%">${totalUnidades}</td>
                      <td class="text-right" style="width: 18%">${formatPaquetes(totalPaquetes)}</td>
                      <td class="text-right" style="width: 19%">${formatPeso(totalPeso)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>`
              : `<div style="margin-top: auto;"></div>`
          }

          <div class="footer" style="position: static; display: flex; justify-content: space-between; font-size: 11px; font-style: italic; border-top: 1px solid #000080; padding-top: 6px; color: #000080;">
            <span>${escapeHtml(fechaFooter)}</span>
            <span>Página ${pageIndex + 1} de ${totalPages}</span>
          </div>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page {
        size: A4;
        margin: 1cm;
      }
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #000080;
        line-height: 1.35;
        margin: 0;
        padding: 0;
      }
      .header {
        text-align: center;
        margin-bottom: 18px;
      }
      .header h1 {
        font-style: italic;
        font-size: 25px;
        margin: 0 0 4px 0;
        color: #000080;
      }
      th {
        border-top: 2px solid #000080;
        border-bottom: 2px solid #000080;
        padding: 8px 0;
        font-size: 14px;
        font-style: italic;
        color: #000080;
      }
      td {
        padding: 7px 0;
        font-size: 13.5px;
      }
      .text-right { text-align: right; }
      .text-left { text-align: left; }
      .text-center { text-align: center; }

      .grand-total td {
        border-top: 2px dashed #000080;
        border-bottom: 2px dashed #000080;
        padding: 10px 0;
        font-weight: bold;
        font-style: italic;
        font-size: 14.5px;
        color: #000080;
      }
    </style>
  </head>
  <body>
    ${pagesHtml}
  </body>
</html>`;
}

/**
 * Servicio para generar el informe en PDF
 */
export async function informeTubos({
  path: destinationPath,
  ids,
}: InformeTubosOptions = {}): Promise<Buffer> {
  const pool = await getConnection("tubos");
  const reportRows = await obtenerDatosInforme(pool, ids);

  if (reportRows.length === 0) {
    throw new Error(
      "No se encontraron tubos activos con unidades disponibles en el inventario.",
    );
  }

  // 1. Generar HTML completo con las agrupaciones y paginación
  const htmlContent = generarHtmlInforme(reportRows);

  // 2. Renderizar a PDF mediante Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

  const pdfUint8Array = await page.pdf({
    format: "A4",
    margin: {
      top: "1cm",
      bottom: "1cm",
      left: "1cm",
      right: "1cm",
    },
    printBackground: true,
  });

  await browser.close();

  const pdfBuffer = Buffer.from(pdfUint8Array);

  // 3. Guardar opcionalmente en disco local
  if (destinationPath) {
    const dir = path.dirname(destinationPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(destinationPath, pdfBuffer);
  }

  return pdfBuffer;
}
