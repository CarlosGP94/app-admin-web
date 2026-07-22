// @/app/api/tipos/tubos/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerTiposTubosService } from "@/lib/services/tipos.service";

export async function GET() {
  try {
    const pool = await getConnection("tubos");
    const data = await obtenerTiposTubosService(pool);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener tipos de tubos:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
