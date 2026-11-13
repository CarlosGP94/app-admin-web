import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  FiltrosMallasParams,
  listarFiltrosMallasService,
} from "@/lib/services/mallas/mallas.service";

/**
 * GET: Obtiene dinámicamente los selectores de calidades, tipos y espesores
 * en base a los filtros cruzados actuales de la tabla de tubos.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer los filtros aplicados actualmente desde la URL.
    // Se aceptan los nombres que envía la tabla (plurales) y los singulares
    // históricos para no romper consumidores existentes.
    const busqueda = searchParams.get("search") || undefined;

    const regionParam =
      searchParams.get("regiones") ?? searchParams.get("regionId");
    const diametroParam =
      searchParams.get("diametros") ?? searchParams.get("diametro");

    const regionId = regionParam ? Number(regionParam) : undefined;
    const diametro = diametroParam ? Number(diametroParam) : undefined;
    const transversales = searchParams.get("transversales")
      ? Number(searchParams.get("transversales"))
      : undefined;
    const longitudinales = searchParams.get("longitudinales")
      ? Number(searchParams.get("longitudinales"))
      : undefined;

    // 2. Obtener el Connection Pool
    const pool = await getConnection();

    // 3. Mapear parámetros al formato estricto que espera el servicio de tubos
    const params: FiltrosMallasParams = {
      filtros: {
        busqueda,
        regionId,
        diametro,
        transversales,
        longitudinales,
      },
    };

    // 4. Invocar la ejecución paralela en la base de datos para los selectores cruzados
    const resultado = await listarFiltrosMallasService(pool, params);

    // 5. Responder con la estructura limpia para alimentar los pickers/comboboxes del frontend
    return NextResponse.json({
      success: true,
      data: {
        regiones: resultado.regiones,
        diametros: resultado.diametros,
        transversales: resultado.transversales,
        longitudinales: resultado.longitudinales,
      },
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/mallas/mallas/filtros:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las opciones dinámicas de filtros para mallas.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
