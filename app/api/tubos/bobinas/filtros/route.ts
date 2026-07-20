import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { listarFiltrosBobinasService } from "@/lib/services/bobinas.service";

/**
 * GET: Obtiene dinámicamente los selectores de fabricantes, calidades,
 * espesores y rangos de fecha en base a los filtros cruzados actuales.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los filtros aplicados actualmente desde la URL
    const busqueda = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidadId")
      ? Number(searchParams.get("calidadId"))
      : undefined;
    const fabricanteId = searchParams.get("fabricanteId")
      ? Number(searchParams.get("fabricanteId"))
      : undefined;
    const espesor = searchParams.get("espesor")
      ? Number(searchParams.get("espesor"))
      : undefined;
    const fechaInicio = searchParams.get("fecha_start") || undefined;
    const fechaFin = searchParams.get("fecha_end") || undefined;

    // 2. Obtener el Connection Pool
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al formato que espera tu servicio
    const params = {
      filtros: {
        busqueda,
        calidadId,
        fabricanteId,
        espesor,
        fechaInicio,
        fechaFin,
      },
    };

    // 4. Invocar la ejecución paralela en la base de datos
    const resultado = await listarFiltrosBobinasService(pool, params);

    // 5. Responder con la estructura limpia para los pickers
    return NextResponse.json({
      success: true,
      data: {
        fabricantes: resultado.fabricantes,
        calidades: resultado.calidades,
        espesores: resultado.espesores,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/bobinas/filtros:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
