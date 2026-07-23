// app/api/tubos/tubos/[id]/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  eliminarTuboService,
  obtenerTuboPorIdService,
} from "@/lib/services/tubos.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }, // <-- Tipado como Promise
) {
  try {
    // Resolvemos la promesa para extraer el ID
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ message: "ID no válido" }, { status: 400 });
    }

    const pool = await getConnection("tubos");
    const tubo = await obtenerTuboPorIdService(pool, id);

    if (!tubo) {
      return NextResponse.json(
        { message: "Tubo no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(tubo);
  } catch (error) {
    console.error("Error al obtener tubo:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tuboId = Number(id);

    // 1. Validar que el ID recibido sea un número válido
    if (isNaN(tuboId) || tuboId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de tubo inválido o no proporcionado.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Ejecutar el servicio de eliminación
    const resultado = await eliminarTuboService(pool, tuboId);

    // 4. Si el tubo no se encontró en la BD
    if (!resultado.eliminado) {
      return NextResponse.json(
        {
          success: false,
          error: `No se encontró ningún tubo con el ID ${tuboId}.`,
        },
        { status: 404 },
      );
    }

    // 5. Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: resultado,
        message: "Tubo eliminado correctamente.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al eliminar el tubo:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error interno en el servidor al intentar eliminar el tubo.",
      },
      { status: 500 },
    );
  }
}
