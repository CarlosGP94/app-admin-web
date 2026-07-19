import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  listarFiltrosSalidasPaquetesService,
  type ListarFiltrosSalidasPaquetesParams,
} from "@/lib/services/salidas-paquetes.service";

/**
 * GET: Obtiene dinámicamente las opciones disponibles de calidades,
 * operarios y el rango de fechas límite basándose en los filtros cruzados de salidas.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los parámetros de la URL correspondientes a la salida de paquetes
    const calidadId = searchParams.get("calidad") || undefined;
    const operarioId = searchParams.get("operario") || undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 2. Obtener el Connection Pool de la base de datos de tubos
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros con los nuevos tipos del servicio de salidas
    const params: ListarFiltrosSalidasPaquetesParams = {
      filtros: {
        calidadId: calidadId ? Number(calidadId) : undefined,
        operarioId: operarioId ? Number(operarioId) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    // 4. Invocar la ejecución paralela del servicio especializado en salidas
    const resultado = await listarFiltrosSalidasPaquetesService(pool, params);

    // 5. Responder con la estructura limpia estructurada para el frontend
    return NextResponse.json({
      success: true,
      data: {
        calidades: resultado.calidades,
        operarios: resultado.operarios,
        rangoFechas: resultado.rangoFechas,
      },
    });
  } catch (error: unknown) {
    console.error(
      "❌ Error en GET /api/tubos/salidas-paquetes/filtros:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros para salidas de paquetes.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
