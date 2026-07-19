import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarSalidasPaqsParams,
  listarSalidasPaqsService,
} from "@/lib/services/salidas-paquetes.service"; // Asegúrate de ajustar la ruta al archivo de tu servicio

/**
 * GET: Lista, filtra, pagina y ordena las salidas de paquetes de tubos
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

    // 2. Extraer filtros específicos solicitados para las salidas
    const busqueda = searchParams.get("search") || undefined;
    const operario = searchParams.get("operario") || undefined;
    const calidad = searchParams.get("calidad") || undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined; // Formato esperado: YYYY-MM-DD
    const fechaFin = searchParams.get("fechaFin") || undefined; // Formato esperado: YYYY-MM-DD

    // 3. Obtener la conexión a la base de datos de la línea de tubos
    const pool = await getConnection("tubos");

    // 4. Mapear parámetros al formato estricto del servicio
    const params: ListarSalidasPaqsParams = {
      page,
      limit,
      orderBy,
      orderDir,
      filtros: {
        busqueda,
        operario: operario ? Number(operario) : undefined,
        calidad: calidad ? Number(calidad) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarSalidasPaqsService(pool, params);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.limit,
      totalPages: resultado.totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/salidas_paquetes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las salidas de paquetes.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
