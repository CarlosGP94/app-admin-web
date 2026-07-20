import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarTubosParams,
  listarTubosService,
} from "@/lib/services/tubos.service"; // Ajusta la ruta a donde guardaste el servicio de tubos

/**
 * GET: Lista, filtra, pagina y ordena los tubos
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10); // Consistencia con la UI usando 'limit'

    // 2. Extraer y sanear ordenación (Columnas permitidas para Tubos)
    const orderByParam = searchParams.get("orderBy");
    let orderBy:
      | "unidades"
      | "num_paquetes"
      | "peso_total"
      | "art_concepto"
      | undefined = undefined;

    if (
      orderByParam === "unidades" ||
      orderByParam === "num_paquetes" ||
      orderByParam === "peso_total" ||
      orderByParam === "art_concepto"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "DESC" ? "DESC" : "ASC";

    // 3. Extraer filtros específicos del módulo de tubos
    const buscar = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidad") || undefined;
    const tipoId = searchParams.get("tipo") || undefined;
    const espesor = searchParams.get("espesor") || undefined;

    // 4. Obtener el Connection Pool correspondiente
    const pool = await getConnection("tubos");

    // 5. Mapear parámetros al formato estricto que requiere el servicio de tubos
    const params: ListarTubosParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        calidadId: calidadId ? Number(calidadId) : undefined,
        tipoId: tipoId ? Number(tipoId) : undefined,
        espesor: espesor ? Number(espesor) : undefined,
      },
    };

    const resultado = await listarTubosService(pool, params);

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
    console.error("❌ Error en GET /api/tubos/tubos:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de tubos.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
