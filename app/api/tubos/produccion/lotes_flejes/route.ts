import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerProdLotesTubosConFlejesService } from "@/lib/services/produccion.service";

/**
 * GET: Obtiene la producción de tubos y sus flejes mediante una lista de IDs (prod_tubo_ids).
 * Si no se pasan IDs, retorna un listado vacío.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Extraer IDs desde la URL (Soporta ?ids=1,2,3 o ?ids=1&ids=2)
    const rawIds = searchParams.getAll("ids");
    const prodTuboIds: number[] = rawIds
      .flatMap((item) => item.split(","))
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id) && id > 0);

    // Si no se proporcionaron IDs válidos, devolvemos array vacío de inmediato
    if (prodTuboIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Obtener pool y consultar el servicio
    const pool = await getConnection("tubos");
    const data = await obtenerProdLotesTubosConFlejesService(pool, prodTuboIds);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/auditoria/lotes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar la producción de tubos.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
