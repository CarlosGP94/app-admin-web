import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  eliminarProduccionTuboService,
  obtenerProduccionTuboPorIdService,
} from "@/lib/services/produccion.service";

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

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const produccionId = Number(id);

    // 1. Validar que el ID recibido sea un número válido
    if (isNaN(produccionId) || produccionId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de producción inválido o no proporcionado.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Ejecutar el servicio de eliminación
    const resultado = await eliminarProduccionTuboService(pool, produccionId);

    // 4. Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: resultado,
        message: "Producción de tubo eliminada correctamente.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al eliminar la producción de tubo:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error interno en el servidor al intentar eliminar la producción.",
      },
      { status: 500 },
    );
  }
}
