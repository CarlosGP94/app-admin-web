// @/app/api/maquinas/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { obtenerFabricantesService } from "@/lib/services/fabricantes.service";

export async function GET() {
  try {
    const pool = await getConnection("tubos");
    const data = await obtenerFabricantesService(pool);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error al obtener los fabricantes:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
