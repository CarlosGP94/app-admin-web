import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerProduccionTuboPorIdService } from "@/lib/services/produccion.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "ID de producción inválido" },
        { status: 400 },
      );
    }

    const pool = await getConnection("tubos");
    const data = await obtenerProduccionTuboPorIdService(pool, id);

    if (!data) {
      return NextResponse.json(
        { success: false, message: "Producción no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener detalle de producción:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
