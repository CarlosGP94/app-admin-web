import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerLotesTubosService } from "@/lib/services/lotes-tubos.service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha") || undefined;
    const maquinaId = searchParams.get("maquina_id") || undefined;

    const pool = await getConnection("tubos");
    const lotes = await obtenerLotesTubosService(
      pool,
      fecha,
      maquinaId ? parseInt(maquinaId, 10) : undefined,
    );

    return NextResponse.json({ success: true, data: lotes });
  } catch (error) {
    console.error("Error al obtener los lotes de tubo:", error);
    return NextResponse.json(
      { success: false, message: "Error interno al consultar los lotes" },
      { status: 500 },
    );
  }
}
