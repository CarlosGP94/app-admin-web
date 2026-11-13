import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  actualizarMallaProduccionService,
  eliminarProduccionMallaService,
  obtenerProduccionMallaPorIdService,
} from "@/lib/services/mallas/producciones.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ActualizarMallaBody {
  malla_id?: unknown;
}

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET: Obtiene una producción por su ID para el formulario de edición.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, error: "ID de producción inválido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const data = await obtenerProduccionMallaPorIdService(pool, id);

    if (!data) {
      return NextResponse.json(
        { success: false, error: "La producción no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error(`❌ Error en GET /api/mallas/producciones/[id]:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener la producción.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT: Actualiza la malla asignada a una producción.
 * Las medidas del formulario son ilustrativas y no se modifican.
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, error: "ID de producción inválido." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as ActualizarMallaBody;
    const mallaId = Number(body.malla_id);

    if (!Number.isInteger(mallaId) || mallaId < 0) {
      return NextResponse.json(
        { success: false, error: "El campo malla_id es obligatorio y válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await actualizarMallaProduccionService(pool, {
      id,
      malla_id: mallaId,
    });

    if (!resultado.actualizado) {
      return NextResponse.json(
        { success: false, error: "La producción no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Malla de la producción actualizada correctamente.",
      data: resultado,
    });
  } catch (error: unknown) {
    console.error(`❌ Error en PUT /api/mallas/producciones/[id]:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar la producción.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Elimina un registro de producción.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, error: "ID de producción inválido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await eliminarProduccionMallaService(pool, id);

    if (!resultado.eliminado) {
      return NextResponse.json(
        { success: false, error: "La producción no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Producción eliminada correctamente.",
      data: resultado,
    });
  } catch (error: unknown) {
    console.error(`❌ Error en DELETE /api/mallas/producciones/[id]:`, error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al eliminar la producción.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
