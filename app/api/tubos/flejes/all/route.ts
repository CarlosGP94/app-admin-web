import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { listarFlejesSelectorService } from "@/lib/services/flejes.service"; // Ajusta la ruta a tu servicio

/**
 * GET: Obtiene la lista simplificada de flejes activos para selectores (id, concepto)
 */
export async function GET() {
  try {
    // 1. Obtención de la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 2. Llamada al servicio simplificado para el selector
    const data = await listarFlejesSelectorService(pool);

    // 3. Respuesta estructurada
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/flejes/selector:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener el listado de flejes para el selector.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
