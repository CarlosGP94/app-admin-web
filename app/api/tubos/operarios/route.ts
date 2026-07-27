import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerOperariosService } from "@/lib/services/operarios.service";

export async function GET() {
  try {
    const pool = await getConnection("tubos");
    const data = await obtenerOperariosService(pool);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener operarios:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
