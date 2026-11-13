import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  eliminarMallaService,
  obtenerMallaEdicionService,
} from "@/lib/services/mallas/mallas.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET: Obtiene una malla por su ID para el formulario de edición.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, error: "ID de malla inválido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const data = await obtenerMallaEdicionService(pool, id);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "La malla no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error(`❌ Error en GET /api/mallas/mallas/[id]:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener la malla.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Elimina una malla y sus relaciones asociadas.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, error: "ID de malla inválido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await eliminarMallaService(pool, id);

    if (!resultado.eliminado) {
      return NextResponse.json(
        { success: false, error: "La malla no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Malla eliminada correctamente.",
      data: resultado,
    });
  } catch (error: unknown) {
    console.error(`❌ Error en DELETE /api/mallas/mallas/[id]:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al eliminar la malla.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
