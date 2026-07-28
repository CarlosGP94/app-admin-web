import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta el import según la ruta de tu conexión
import {
  asignarAuditoriaBobinaService,
  AsignarAuditoriaPayload,
} from "@/lib/services/auditoria.service";

/**
 * POST: Asigna auditoría y colada a un conjunto de flejes y una bobina
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: AsignarAuditoriaPayload = await request.json();

    // 2. Validación básica de campos requeridos
    if (
      !body.flejesIds ||
      !Array.isArray(body.flejesIds) ||
      body.flejesIds.length === 0 ||
      !body.bobinaId ||
      !body.coladaId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'flejesIds' (array no vacío), 'bobinaId' y 'coladaId' son obligatorios.",
        },
        { status: 400 },
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio de asignación
    const resultado = await asignarAuditoriaBobinaService(pool, body);

    // 5. Responder con el resultado del proceso (HTTP 200 OK o 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Auditoría asignada correctamente a los flejes.",
        data: resultado,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/auditorias/asignar:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al asignar la auditoría.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
