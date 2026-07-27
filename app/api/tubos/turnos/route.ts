import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerTurnosService } from "@/lib/services/turnos.service";

export async function GET() {
  try {
    const pool = await getConnection("tubos");
    const data = await obtenerTurnosService(pool);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener turnos:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
