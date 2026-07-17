// app/api/tubos/planes_corte/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  listarPlanesCorteService,
  ListarPlanesCorteParams,
} from "@/lib/services/planes-corte.service";

/**
 * GET: Lista, filtra, pagina y ordena los planes de corte
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación y orden
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

    const orderBy = searchParams.get("orderBy") || "id";
    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "ASC" ? "ASC" : "DESC";

    // 2. Extraer filtros de búsqueda y fechas
    const busqueda = searchParams.get("search") || undefined;
    const anchoEstipuladoParam = searchParams.get("ancho_estipulado");
    const ancho_estipulado = anchoEstipuladoParam
      ? Number(anchoEstipuladoParam)
      : undefined;
    const fechaInicio = searchParams.get("fechaCorte_start") || undefined;
    const fechaFin = searchParams.get("fechaCorte_end") || undefined;

    // 3. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 4. Mapear parámetros al formato estricto del servicio
    const params: ListarPlanesCorteParams = {
      page,
      limit,
      orderBy,
      orderDir,
      filtros: {
        busqueda,
        ancho_estipulado,
        fechaInicio,
        fechaFin,
      },
    };

    // 5. Llamar al servicio optimizado para SQL Server 2008
    const resultado = await listarPlanesCorteService(pool, params);

    // Retornamos la respuesta estandarizada
    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.limit,
      totalPages: resultado.totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/planes_corte:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar los planes de corte.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
