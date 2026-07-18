import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  listarFiltrosProdTubosService,
  type ListarFiltrosProdTubosParams,
} from "@/lib/services/produccion.service";

/**
 * GET: Obtiene dinámicamente las opciones disponibles de calidades,
 * turnos, máquinas y el rango de fechas límite basándose en filtros cruzados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const calidadId = searchParams.get("calidad") || undefined;
    const turnoId = searchParams.get("turno") || undefined;
    const maquinaId = searchParams.get("maquina") || undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 1. Obtener el Connection Pool correspondiente a tubos
    const pool = await getConnection("tubos");

    // 2. Mapear parámetros al formato que espera el servicio de filtros
    const params: ListarFiltrosProdTubosParams = {
      filtros: {
        calidadId: calidadId ? Number(calidadId) : undefined,
        turnoId: turnoId ? Number(turnoId) : undefined,
        maquinaId: maquinaId ? Number(maquinaId) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    // 3. Invocar la ejecución paralela del servicio
    const resultado = await listarFiltrosProdTubosService(pool, params);

    // 4. Responder con la estructura esperada por los componentes del frontend
    return NextResponse.json({
      success: true,
      data: {
        calidades: resultado.calidades,
        turnos: resultado.turnos,
        maquinas: resultado.maquinas,
        operarios: resultado.operarios,
        espesores: resultado.espesores,
        estructural: resultado.estructural,
        rangoFechas: resultado.rangoFechas,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/produccion/filtros:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
