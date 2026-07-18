// app/api/tubos/planes_corte/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarProdTubosParams,
  listarProdTubosService,
} from "@/lib/services/produccion.service";

/**
 * GET: Lista, filtra, pagina y ordena las bobinas cortadas
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
    const espesor = searchParams.get("espesor") || undefined;
    const calidad = searchParams.get("calidad") || undefined;
    const turno = searchParams.get("turno") || undefined;
    const estructural = searchParams.get("estructural") || undefined;
    const operario = searchParams.get("operario") || undefined;
    const maquina = searchParams.get("maquina") || undefined;
    const fechaInicio = searchParams.get("fechaCorte_start") || undefined;
    const fechaFin = searchParams.get("fechaCorte_end") || undefined;

    // 3. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 4. Mapear parámetros al formato estricto del servicio
    const params: ListarProdTubosParams = {
      page,
      limit,
      orderBy,
      orderDir,
      filtros: {
        busqueda,
        espesor: espesor ? Number(espesor) : undefined,
        calidad: calidad ? Number(calidad) : undefined,
        turno: turno ? Number(turno) : undefined,
        estructural:
          estructural === "true"
            ? true
            : estructural === "false"
              ? false
              : undefined,
        operario: operario ? Number(operario) : undefined,
        maquina: maquina ? Number(maquina) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarProdTubosService(pool, params);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.limit,
      totalPages: resultado.totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/produccion:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las producciones de tubos.";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
