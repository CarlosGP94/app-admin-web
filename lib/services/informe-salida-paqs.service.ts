import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { ConnectionPool, VarChar } from "mssql";
import { getConnection } from "@/lib/db";

export interface SalidaPaqueteReportRow {
  tubo: string;
  num_paqs: number;
  resto: number;
  fecha: string;
  creado: Date | string;
}

export interface InformeSalidaPaquetesOptions {
  fechaInicio?: string;
  fechaFin?: string;
  path?: string;
}

// Configuración de filas por página ajustada a 28 líneas
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

function formatDate(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Obtiene los datos de salida de paquetes desde la base de datos
 */
async function obtenerDatosInforme(
  pool: ConnectionPool,
  fechaInicio?: string,
  fechaFin?: string,
): Promise<SalidaPaqueteReportRow[]> {
  const request = pool.request();
  const whereClauses: string[] = [];

  if (fechaInicio) {
    request.input("fechaInicio", fechaInicio);
    whereClauses.push("sp.creado >= @fechaInicio");
  }

  if (fechaFin) {
    request.input("fechaFin", `${fechaFin} 23:59:59.999`);
    whereClauses.push("sp.creado <= @fechaFin");
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const query = `
    SELECT 
      ISNULL(t.art_concepto, 'Desconocido') AS tubo,
      ISNULL(sp.num_paqs, 0) AS num_paqs,
      ISNULL(sp.resto, 0) AS resto,
      sp.creado AS creado,
      CONVERT(VARCHAR, sp.creado, 103) AS fecha
    FROM Salidas_Paqs_Tubos sp
    LEFT JOIN Tubos t ON sp.tubo_id = t.id
    LEFT JOIN Tipos_Calidad tc ON t.calidad_id = tc.id
    LEFT JOIN Tipos_Tubos tt ON t.tipo_id = tt.id
    ${whereSql}
    ORDER BY 
      sp.creado DESC,
      tc.nombre ASC,
      t.espesor ASC,
      tt.nombre ASC,
      t.ancho ASC,
      t.alto ASC,
      t.diametro ASC,
      t.medida ASC;
  `;

  const result = await request.query(query);
  return (result.recordset as SalidaPaqueteReportRow[]) || [];
}

/**
 * Genera el documento HTML completo listo para convertir a PDF
 */
function generarHtmlInforme(
  reportRows: SalidaPaqueteReportRow[],
  fechaInicio?: string,
  fechaFin?: string,
): string {
  // 1. Totales generales
  const totalPaquetes = reportRows.reduce(
    (acc, row) => acc + Number(row.num_paqs || 0),
    0,
  );
  const totalResto = reportRows.reduce(
    (acc, row) => acc + Number(row.resto || 0),
    0,
  );

  // 2. Paginar filas
  const pages: SalidaPaqueteReportRow[][] = [];
  let currentPage: SalidaPaqueteReportRow[] = [];

  for (const row of reportRows) {
    if (currentPage.length >= ROWS_PER_PAGE_TEMPLATE) {
      pages.push(currentPage);
      currentPage = [];
    }
    currentPage.push(row);
  }

  if (currentPage.length > 0 || pages.length === 0) {
    pages.push(currentPage);
  }

  const totalPages = Math.max(1, pages.length);
  const fechaFooter = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Texto del rango para el encabezado opcional
  let rangoTexto = "";
  if (fechaInicio && fechaFin) {
    rangoTexto = ` (del ${formatDate(fechaInicio)} al ${formatDate(fechaFin)})`;
  } else if (fechaInicio) {
    rangoTexto = ` (desde ${formatDate(fechaInicio)})`;
  } else if (fechaFin) {
    rangoTexto = ` (hasta ${formatDate(fechaFin)})`;
  }

  // 3. Construcción de secciones por página HTML
  const pagesHtml = pages
    .map((pageRows, pageIndex) => {
      const rowsHtml = pageRows.length
        ? pageRows
            .map((row) => {
              const paqsRestoStr =
                row.resto > 0
                  ? `${row.num_paqs} / ${row.resto}`
                  : `${row.num_paqs}`;

              return `
                <tr>
                  <td class="text-left">${escapeHtml(row.tubo.toLocaleUpperCase())}</td>
                  <td class="text-center">${escapeHtml(paqsRestoStr)}</td>
                  <td class="text-right">${escapeHtml(row.fecha || formatDate(row.creado))}</td>
                </tr>`;
            })
            .join("")
        : `<tr><td colspan="3" class="text-center" style="padding: 16px 0;">No se encontraron registros de salida.</td></tr>`;

      const showTotals = pageIndex === totalPages - 1;
      const pageBreakStyle =
        pageIndex === totalPages - 1
          ? ""
          : "page-break-after: always; break-after: page;";

      return `
        <section class="pdf-page" style="min-height: 270mm; display: flex; flex-direction: column; box-sizing: border-box; ${pageBreakStyle}">
          <div class="header">
            <h1>Informe de Salida de Paquetes${escapeHtml(rangoTexto)}</h1>
          </div>

          <table style="margin-bottom: 14px; width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th class="text-left" style="width: 50%">Tubo</th>
                <th class="text-center" style="width: 25%">Paquetes / Resto</th>
                <th class="text-right" style="width: 25%">Fecha</th>
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
                      <td class="text-left" style="width: 50%">Total general</td>
                      <td class="text-center" style="width: 25%">${totalPaquetes}${totalResto > 0 ? ` / ${totalResto}` : ""}</td>
                      <td class="text-right" style="width: 25%">-</td>
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
        font-size: 22px;
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
 * Servicio para generar el informe de salida de paquetes en PDF
 */
export async function informeSalidaPaquetes({
  fechaInicio,
  fechaFin,
  path: destinationPath,
}: InformeSalidaPaquetesOptions = {}): Promise<Buffer> {
  const pool = await getConnection("tubos");
  const reportRows = await obtenerDatosInforme(pool, fechaInicio, fechaFin);

  if (reportRows.length === 0) {
    throw new Error(
      "No se encontraron salidas de paquetes en el rango de fechas indicado.",
    );
  }

  // 1. Generar HTML
  const htmlContent = generarHtmlInforme(reportRows, fechaInicio, fechaFin);

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
