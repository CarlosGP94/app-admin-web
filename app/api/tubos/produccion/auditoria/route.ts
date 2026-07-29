import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta el path de tu conexión
import { generarExcelProdTubosService } from "@/lib/services/produccion.service";

/**
 * GET: Valida la trazabilidad de coladas y genera el Excel para los IDs de Prod_Tubos especificados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    const pool = await getConnection("tubos");

    const excelBuffer = await generarExcelProdTubosService(pool, {
      fechaInicio,
      fechaFin,
    });

    // Normalize possible return types (Buffer | ArrayBuffer | Uint8Array)
    const buf: Buffer | ArrayBuffer | Uint8Array | null = excelBuffer as
      | Buffer
      | ArrayBuffer
      | Uint8Array
      | null;

    let body: Uint8Array;
    if (buf === null) throw new Error("No se generó el archivo Excel.");
    if (Buffer.isBuffer(buf)) {
      body = new Uint8Array(buf);
    } else if (buf instanceof ArrayBuffer) {
      body = new Uint8Array(buf);
    } else if (ArrayBuffer.isView(buf)) {
      body = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    } else {
      // Fallback: try to convert via Buffer
      body = new Uint8Array(Buffer.from(String(buf)));
    }

    // Wrap Uint8Array in a Blob to satisfy BodyInit typing for NextResponse
    const blob = new Blob([Buffer.from(body)]);

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Reporte_Produccion_Estructurales_${Date.now()}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error al exportar Excel:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    const isValidationError = message.includes("Error de trazabilidad");

    return NextResponse.json(
      { success: false, error: message },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
