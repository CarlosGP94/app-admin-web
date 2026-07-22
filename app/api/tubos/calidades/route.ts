// @/app/api/calidades/tubos/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerCalidadesTubosService } from "@/lib/services/calidades.service";

export async function GET() {
  try {
    const pool = await getConnection("tubos");
    const data = await obtenerCalidadesTubosService(pool);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener calidades de tubos:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
