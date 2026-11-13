import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  actualizarEtiquetaService,
  eliminarEtiquetaService,
  EtiquetaUpdatePayload,
} from "@/lib/services/mallas/etiquetas.service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PUT: Actualizar un registro de etiqueta existente por ID
 */
export async function PUT(request: Request, { params }: RouteParams) {
  let rawId = "";
  try {
    const resolved = await params;
    rawId = resolved.id;
    const id = Number(rawId);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID de etiqueta inválido." },
        { status: 400 }
      );
    }

    const body: Omit<EtiquetaUpdatePayload, "id"> = await request.json();

    // Validación básica de campos requeridos
    if (
      !body.maquina_id ||
      !body.turno_id ||
      !body.malla_id ||
      body.no_paquete === undefined ||
      !body.lote
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos obligatorios son: maquina_id, turno_id, malla_id, no_paquete y lote.",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await actualizarEtiquetaService(pool, {
      ...body,
      id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Etiqueta actualizada correctamente.",
        data: resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `❌ Error en PUT /api/produccion/etiquetas/${rawId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar el registro de etiqueta.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Eliminar un registro de etiqueta por ID
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  let rawId = "";
  try {
    const resolved = await params;
    rawId = resolved.id;
    const id = Number(rawId);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: "ID de etiqueta inválido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await eliminarEtiquetaService(pool, id);

    if (!resultado.eliminado) {
      return NextResponse.json(
        { success: false, error: "El registro de etiqueta no existe." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Etiqueta eliminada correctamente.",
        data: resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error(
      `❌ Error en DELETE /api/produccion/etiquetas/${rawId}:`,
      error
    );
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al eliminar el registro de etiqueta.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
