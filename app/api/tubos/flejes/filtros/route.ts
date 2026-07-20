import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  FiltrosFlejesParams,
  listarFiltrosFlejesService,
} from "@/lib/services/flejes.service"; // Ajusta la ruta según tu estructura de carpetas

/**
 * GET: Obtiene dinámicamente los selectores de calidades y espesores
 * en base a los filtros cruzados actuales de la tabla de flejes.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los filtros aplicados actualmente desde la URL
    const busqueda = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidadId")
      ? Number(searchParams.get("calidadId"))
      : undefined;
    const espesor = searchParams.get("espesor")
      ? Number(searchParams.get("espesor"))
      : undefined;

    // 2. Obtener el Connection Pool
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al formato estricto que espera el servicio de flejes
    const params: FiltrosFlejesParams = {
      filtros: {
        busqueda,
        calidadId,
        espesor,
      },
    };

    // 4. Invocar la ejecución paralela en la base de datos para los selectores cruzados
    const resultado = await listarFiltrosFlejesService(pool, params);

    // 5. Responder con la estructura limpia para alimentar los pickers/comboboxes del frontend
    return NextResponse.json({
      success: true,
      data: {
        calidades: resultado.calidades,
        espesores: resultado.espesores,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/flejes/filtros:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros para flejes.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
