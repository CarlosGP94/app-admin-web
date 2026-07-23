import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta según la ubicación de tu helper
import {
  eliminarFlejeService,
  obtenerFlejePorIdService,
} from "@/lib/services/flejes.service";

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
    const fleje = await obtenerFlejePorIdService(pool, id);

    if (!fleje) {
      return NextResponse.json(
        { message: "Fleje no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json(fleje, { status: 200 });
  } catch (error) {
    console.error("Error al obtener fleje:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const flejeId = Number(id);

    // 1. Validar que el ID recibido sea un número válido
    if (isNaN(flejeId) || flejeId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de fleje inválido o no proporcionado.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Ejecutar el servicio de eliminación
    const resultado = await eliminarFlejeService(pool, flejeId);

    // 4. Si el fleje no se encontró en la BD
    if (!resultado.eliminado) {
      return NextResponse.json(
        {
          success: false,
          error: `No se encontró ningún fleje con el ID ${flejeId}.`,
        },
        { status: 404 },
      );
    }

    // 5. Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: resultado,
        message: "Fleje eliminado correctamente.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al eliminar el fleje:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error interno en el servidor al intentar eliminar el fleje.",
      },
      { status: 500 },
    );
  }
}
