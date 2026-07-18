// app/api/tubos/bobinas_cortadas/filtros/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  FiltrosPlanesCorte,
  listarFiltrosPlanesCorteService,
} from "@/lib/services/planes-corte.service";

/**
 * GET: Obtiene dinámicamente las opciones disponibles de coladas,
 * fabricantes y el rango de fechas límite en base a los filtros cruzados.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const ancho_estipulado = searchParams.get("ancho_estipulado") || undefined;
    const fechaInicio = searchParams.get("fechaCorte_start") || undefined;
    const fechaFin = searchParams.get("fechaCorte_end") || undefined;

    // 2. Obtener el Connection Pool correspondiente a la planta/línea
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al formato que espera el servicio de filtros
    const params: FiltrosPlanesCorte = {
      ancho_estipulado: ancho_estipulado ? Number(ancho_estipulado) : undefined,
      fechaInicio,
      fechaFin,
    };

    // 4. Invocar la ejecución paralela del servicio
    const resultado = await listarFiltrosPlanesCorteService(pool, params);

    // 5. Responder con la estructura esperada por los selectores/pickers del frontend
    return NextResponse.json({
      success: true,
      data: {
        anchos: resultado.anchos,
        rangoFechas: resultado.rangoFechas,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/planes_corte/filtros:", error);

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
