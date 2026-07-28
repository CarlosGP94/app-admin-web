import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta la ruta a tu cliente/pool de DB
import {
  ListarLotesParams,
  listarLotesTubosService,
} from "@/lib/services/lotes-tubos.service";

/**
 * GET: Lista, filtra, pagina y ordena los lotes de tubos
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10);

    // 2. Extraer y sanear ordenación (Validación de columnas permitidas)
    const orderByParam = searchParams.get("orderBy");
    let orderBy: "id" | "lote" | "creado" | "maquina" | undefined = undefined;

    if (
      orderByParam === "id" ||
      orderByParam === "lote" ||
      orderByParam === "creado" ||
      orderByParam === "maquina"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "ASC" ? "ASC" : "DESC"; // Por defecto DESC para lotes recientes

    // 3. Extraer filtros específicos del módulo de lotes
    const buscar = searchParams.get("search") || undefined;
    const lote = searchParams.get("lote") || undefined;
    const maquinaId = searchParams.get("maquinaId") || undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 4. Obtener el Connection Pool correspondiente a la línea de producción
    const pool = await getConnection("tubos");

    // 5. Mapear parámetros al formato estricto del servicio de lotes
    const params: ListarLotesParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        lote,
        maquinaId: maquinaId ? Number(maquinaId) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarLotesTubosService(pool, params);

    // 6. Calcular total de páginas para la respuesta del frontend
    const totalPages = Math.ceil(resultado.total / pageSize);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.pageSize,
      totalPages: totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/auditoria/lotes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de lotes de tubos.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
