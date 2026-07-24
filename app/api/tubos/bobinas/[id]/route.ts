import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  eliminarBobinaService,
  obtenerBobinaPorIdService,
} from "@/lib/services/bobinas.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Resolvemos la promesa para extraer el ID
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json({ message: "ID no válido" }, { status: 400 });
    }

    // 2. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Consultar el servicio
    const bobina = await obtenerBobinaPorIdService(pool, id);

    return NextResponse.json(bobina, { status: 200 });
  } catch (error: unknown) {
    console.error("❌ Error al obtener bobina:", error);

    // Si el servicio lanzó un error por ID no encontrado
    if (error instanceof Error && error.message.includes("No se encontró")) {
      return NextResponse.json(
        { message: "Bobina no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Error interno del servidor" },
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
    const bobinaId = Number(id);

    // 1. Validar que el ID recibido sea un número válido
    if (isNaN(bobinaId) || bobinaId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de bobina inválido o no proporcionado.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 3. Ejecutar el servicio de eliminación
    const resultado = await eliminarBobinaService(pool, bobinaId);

    // 4. Si la bobina no se encontró en la BD
    if (!resultado.eliminado) {
      return NextResponse.json(
        {
          success: false,
          error: `No se encontró ninguna bobina con el ID ${bobinaId}.`,
        },
        { status: 404 },
      );
    }

    // 5. Respuesta exitosa
    return NextResponse.json(
      {
        success: true,
        data: resultado,
        message: "Bobina eliminada correctamente.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error al eliminar la bobina:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error interno en el servidor al intentar eliminar la bobina.",
      },
      { status: 500 },
    );
  }
}
