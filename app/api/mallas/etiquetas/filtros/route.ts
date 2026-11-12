import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  FiltrosEtiquetasParams,
  listarFiltrosEtiquetasService,
} from "@/lib/services/mallas/etiquetas.service";

/**
 * GET: Obtiene dinámicamente los selectores de máquinas y turnos
 * en base a los filtros cruzados actuales de la tabla de etiquetas.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los filtros aplicados actualmente desde la URL
    const busqueda = searchParams.get("search") || undefined;
    const maquina_id = searchParams.get("maquina_id")
      ? Number(searchParams.get("maquina_id"))
      : undefined;
    const turno_id = searchParams.get("turno_id")
      ? Number(searchParams.get("turno_id"))
      : undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 2. Obtener el Connection Pool
    const pool = await getConnection();

    // 3. Mapear parámetros al formato estricto que espera el servicio de etiquetas
    const params: FiltrosEtiquetasParams = {
      filtros: {
        busqueda,
        maquina_id,
        turno_id,
        fechaInicio,
        fechaFin,
      },
    };

    // 4. Invocar la ejecución paralela en la base de datos para los selectores cruzados
    const resultado = await listarFiltrosEtiquetasService(pool, params);

    // 5. Responder con la estructura limpia para alimentar los pickers/comboboxes del frontend
    return NextResponse.json({
      success: true,
      data: {
        maquinas: resultado.maquinas,
        turnos: resultado.turnos,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/produccion/etiquetas/filtros:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros para etiquetas.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
