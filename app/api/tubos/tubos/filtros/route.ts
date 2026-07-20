import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  FiltrosTubosParams,
  listarFiltrosTubosService,
} from "@/lib/services/tubos.service"; // Ajusta la ruta según la estructura de tu proyecto

/**
 * GET: Obtiene dinámicamente los selectores de calidades, tipos y espesores
 * en base a los filtros cruzados actuales de la tabla de tubos.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los filtros aplicados actualmente desde la URL
    const busqueda = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidadId")
      ? Number(searchParams.get("calidadId"))
      : undefined;
    const tipoId = searchParams.get("tipoId")
      ? Number(searchParams.get("tipoId"))
      : undefined;
    const espesor = searchParams.get("espesor")
      ? Number(searchParams.get("espesor"))
      : undefined;

    // 2. Obtener el Connection Pool
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al formato estricto que espera el servicio de tubos
    const params: FiltrosTubosParams = {
      filtros: {
        busqueda,
        calidadId,
        tipoId,
        espesor,
      },
    };

    // 4. Invocar la ejecución paralela en la base de datos para los selectores cruzados
    const resultado = await listarFiltrosTubosService(pool, params);

    // 5. Responder con la estructura limpia para alimentar los pickers/comboboxes del frontend
    return NextResponse.json({
      success: true,
      data: {
        calidades: resultado.calidades,
        tipos: resultado.tipos,
        espesores: resultado.espesores,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/tubos/filtros:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros para tubos.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
