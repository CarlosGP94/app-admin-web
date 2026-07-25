import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta según la ubicación de tu helper
import {
  eliminarPlanCorteService,
  obtenerPlanCorteDetalleService,
} from "@/lib/services/planes-corte.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Resolvemos la promesa para extraer el ID
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ message: "ID no válido" }, { status: 400 });
    }

    const pool = await getConnection("tubos");
    const fleje = await obtenerPlanCorteDetalleService(pool, id);

    if (!fleje) {
      return NextResponse.json(
        { message: "Plan de corte no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(fleje, { status: 200 });
  } catch (error) {
    console.error("Error al obtener plan de corte:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const planCorteId = Number(id);

    // 1. Validar que el ID recibido sea un número válido
    if (isNaN(planCorteId) || planCorteId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de plan de corte inválido o no proporcionado.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Ejecutar el servicio de eliminación
    const resultado = await eliminarPlanCorteService(pool, planCorteId);

    // 5. Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: resultado,
        message: "Plan de corte eliminado correctamente.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al eliminar el plan de corte:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error interno en el servidor al intentar eliminar el plan de corte.",
      },
      { status: 500 },
    );
  }
}
