import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { listarCertificadosOpcionesService } from "@/lib/services/mallas/certificados.service";

/**
 * GET: Lista los certificados disponibles para el selector del formulario
 * de mallas.
 */
export async function GET() {
  try {
    const pool = await getConnection();
    const data = await listarCertificadosOpcionesService(pool);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/mallas/certificados/opciones:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener las opciones de certificados.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
