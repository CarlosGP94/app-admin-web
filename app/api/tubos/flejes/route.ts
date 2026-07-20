import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarFlejesParams,
  listarFlejesService,
} from "@/lib/services/flejes.service"; // Ajusta la ruta a donde guardaste el servicio de flejes

/**
 * GET: Lista, filtra, pagina y ordena los flejes
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10); // Manteniendo consistencia con la UI usando 'limit'

    // 2. Extraer y sanear ordenación (Validación de columnas permitidas)
    const orderByParam = searchParams.get("orderBy");
    let orderBy: "unidades" | "peso_medio" | "concepto" | undefined = undefined;

    if (
      orderByParam === "unidades" ||
      orderByParam === "peso_medio" ||
      orderByParam === "concepto"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "DESC" ? "DESC" : "ASC";

    // 3. Extraer filtros específicos del módulo de flejes
    const buscar = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidad") || undefined;
    const espesor = searchParams.get("espesor") || undefined;

    // 4. Obtener el Connection Pool correspondiente a la línea de producción
    const pool = await getConnection("tubos");

    // 5. Mapear parámetros al formato estricto del servicio de flejes
    const params: ListarFlejesParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        calidadId: calidadId ? Number(calidadId) : undefined,
        espesor: espesor ? Number(espesor) : undefined,
      },
    };

    const resultado = await listarFlejesService(pool, params);

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
    console.error("❌ Error en GET /api/tubos/flejes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de flejes.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
