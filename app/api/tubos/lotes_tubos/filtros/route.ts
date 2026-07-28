import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta la ruta a tu cliente/pool de DB
import {
  FiltrosLotesParams,
  listarFiltrosLotesTubosService,
} from "@/lib/services/lotes-tubos.service";

/**
 * GET: Obtiene las opciones dinámicas para los selectores de filtros de lotes de tubos
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los parametros de filtro actuales de la URL
    const buscar = searchParams.get("search") || undefined;
    const lote = searchParams.get("lote") || undefined;
    const maquinaId = searchParams.get("maquinaId") || undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 2. Obtener el Connection Pool correspondiente a la línea de producción
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al formato estricto del servicio de filtros
    const params: FiltrosLotesParams = {
      filtros: {
        buscar,
        lote,
        maquinaId: maquinaId ? Number(maquinaId) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    // 4. Obtener las opciones de filtros dinámicos (máquinas y rango de fechas)
    const resultado = await listarFiltrosLotesTubosService(pool, params);

    return NextResponse.json({
      success: true,
      data: resultado,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/auditoria/lotes/filtros:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener los filtros de lotes de tubos.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
