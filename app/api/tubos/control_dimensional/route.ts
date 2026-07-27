import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // O tu ruta correspondiente para la conexión SQL
import {
  actualizarControlDimensionalService,
  ControlDimensionalUpdatePayload,
} from "@/lib/services/control-dimensional.service";

// ==========================================
// PUT: Actualizar Control Dimensional existente
// ==========================================
export async function PUT(request: Request) {
  try {
    const body: ControlDimensionalUpdatePayload = await request.json();

    // Validar campos obligatorios básicos
    if (!body.id || !body.maquina_id || !body.tubo_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'id', 'maquina_id' y 'tubo_id' son obligatorios para actualizar el control dimensional.",
        },
        { status: 400 },
      );
    }

    const pool = await getConnection("tubos");
    const resultado = await actualizarControlDimensionalService(pool, body);

    return NextResponse.json(
      {
        success: true,
        message: "Control dimensional actualizado correctamente.",
        data: resultado,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/control-dimensional:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar el control dimensional.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
