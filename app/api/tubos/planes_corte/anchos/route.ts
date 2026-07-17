import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { listarAnchosPlanesCorteService } from "@/lib/services/planes-corte.service";

export async function GET() {
  try {
    const pool = await getConnection("tubos");
    const resultado = await listarAnchosPlanesCorteService(pool);

    return NextResponse.json({
      success: true,
      data: resultado,
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
