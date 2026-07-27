import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta el path de tu conexión de base de datos
import { getControlDimensionalByProdTuboIdService } from "@/lib/services/control-dimensional.service"; // Ajusta la ruta de tu servicio

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // 1. Resolver la promesa de params para extraer el ID de Prod_Tubos
    const { id: rawId } = await params;
    const prodTuboId = parseInt(rawId, 10);

    // 2. Validar que el ID sea un número válido y positivo
    if (isNaN(prodTuboId) || prodTuboId <= 0) {
      return NextResponse.json(
        { message: "ID de producción no válido" },
        { status: 400 },
      );
    }

    // 3. Obtener la conexión al pool de base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio que consulta por prodTuboId
    const controlDimensional = await getControlDimensionalByProdTuboIdService(
      pool,
      prodTuboId,
    );

    return NextResponse.json(controlDimensional, { status: 200 });
  } catch (error: unknown) {
    console.error(
      "Error al obtener el control dimensional por Prod_Tubo:",
      error,
    );

    const message =
      error instanceof Error ? error.message : "Error interno del servidor";

    // Si el registro de producción o su control dimensional no existen
    if (
      message.includes("No se encontró") ||
      message.includes("no encontrado")
    ) {
      return NextResponse.json(
        {
          message:
            "Control dimensional no encontrado para este tubo de producción",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
