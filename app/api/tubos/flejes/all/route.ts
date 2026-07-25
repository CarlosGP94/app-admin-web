import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { listarFlejesSelectorService } from "@/lib/services/flejes.service"; // Ajusta la ruta a tu servicio

/**
 * GET: Obtiene la lista simplificada de flejes activos para selectores (id, concepto)
 * Acepta el query param opcional: ?calidad_id=123
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extraer los parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url);
    const calidadIdParam = searchParams.get("calidad_id");

    // Convertir a número si existe y es un valor numérico válido
    const calidadId = calidadIdParam ? Number(calidadIdParam) : null;
    const calidadIdValido = calidadId && !isNaN(calidadId) ? calidadId : null;

    // 2. Obtención de la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Llamada al servicio pasando el filtro de calidad si existe
    const data = await listarFlejesSelectorService(pool, calidadIdValido);

    // 4. Respuesta estructurada
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
