import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { listarTubosSelectorService } from "@/lib/services/tubos.service"; // Ajusta la ruta a tu servicio

/**
 * GET: Obtiene la lista simplificada de tubos activos para selectores (id, concepto)
 * Acepta query params opcionales: ?calidad_id=123&tipo_tubo_id=456
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Extraer los parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url);
    const calidadIdParam = searchParams.get("calidad_id");
    const tipoTuboIdParam = searchParams.get("tipo_tubo_id");
    const maquinaIdParam = searchParams.get("maquina_id");

    // Convertir a número si existen y son valores numéricos válidos
    const calidadId = calidadIdParam ? Number(calidadIdParam) : null;
    const calidadIdValido = calidadId && !isNaN(calidadId) ? calidadId : null;

    const tipoTuboId = tipoTuboIdParam ? Number(tipoTuboIdParam) : null;
    const tipoTuboIdValido =
      tipoTuboId && !isNaN(tipoTuboId) ? tipoTuboId : null;

    // 2. Obtención de la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Llamada al servicio pasando los filtros si existen
    const data = await listarTubosSelectorService(
      pool,
      calidadIdValido,
      tipoTuboIdValido,
      maquinaIdParam ? Number(maquinaIdParam) : null,
    );

    // 4. Respuesta estructurada
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/selector:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener el listado de tubos para el selector.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
