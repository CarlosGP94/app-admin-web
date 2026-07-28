import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerLotesTubosConFlejesService } from "@/lib/services/lotes-tubos.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        {
          success: false,
          error: "Debe proporcionar al menos un ID de lote (parámetro 'ids').",
        },
        { status: 400 },
      );
    }

    // Convertir la cadena "1,2,3" a un array de números [1, 2, 3]
    const loteTuboIds = idsParam
      .split(",")
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => !isNaN(id));

    if (loteTuboIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Los IDs proporcionados no son válidos.",
        },
        { status: 400 },
      );
    }

    // Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // Invocar el servicio de consulta con los LEFT JOINs
    const lotesWithFlejes = await obtenerLotesTubosConFlejesService(
      pool,
      loteTuboIds,
    );

    return NextResponse.json({
      success: true,
      data: lotesWithFlejes,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/lotes/coladas:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor al consultar los lotes con flejes",
      },
      { status: 500 },
    );
  }
}
