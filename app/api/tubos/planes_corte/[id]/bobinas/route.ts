import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { getBobinasPorPlanCorte } from "@/lib/services/planes-corte.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Obtener y validar el ID del parámetro dinámico
    const { id } = await params;
    const planCorteId = parseInt(id, 10);

    if (isNaN(planCorteId) || planCorteId <= 0) {
      return NextResponse.json(
        { error: "El ID del plan de corte debe ser un número entero válido." },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a SQL Server
    const pool = await getConnection("tubos");

    // 3. Ejecutar el servicio
    const data = await getBobinasPorPlanCorte(pool, planCorteId);

    // 4. Si el plan de corte no existe en base de datos
    if (!data.cabecera) {
      return NextResponse.json(
        { error: `No se encontró el plan de corte con ID #${planCorteId}` },
        { status: 404 },
      );
    }

    // 5. Devolver los datos con código 200 OK
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/tubos/planes-corte/[id]/bobinas:", error);

    return NextResponse.json(
      {
        error: "Ocurrió un error al consultar las bobinas cortadas.",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
