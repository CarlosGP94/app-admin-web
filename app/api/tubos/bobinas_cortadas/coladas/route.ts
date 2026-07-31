import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta la ruta a tu conexión DB si difiere
import {
  actualizarColadaBobinasCortadasService,
  type ActualizarColadaBobinasCortadasParams,
} from "@/lib/services/bobinas-cortadas.service";

export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: ActualizarColadaBobinasCortadasParams = await request.json();

    // 2. Validación de campos requeridos
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El campo 'ids' es obligatorio y debe ser un array con al menos un ID.",
        },
        { status: 400 }
      );
    }

    // Regla de negocio: Si no hay colada_id, se requiere un nombre de colada
    if (!body.colada_id && (!body.colada_nombre || body.colada_nombre.trim() === "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Debe proporcionar 'colada_id' o en su defecto un 'colada_nombre' válido.",
        },
        { status: 400 }
      );
    }

    // Regla de negocio: Si no hay colada_id ni fabricante_id, se requiere un nombre de fabricante
    if (!body.colada_id && !body.fabricante_id && (!body.fabricante_nombre || body.fabricante_nombre.trim() === "")) {
      return NextResponse.json(
        {
          success: false,
          error: "Para crear una colada nueva debe especificar 'fabricante_id' o 'fabricante_nombre'.",
        },
        { status: 400 }
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio de actualización (gestiona la transacción)
    const resultado = await actualizarColadaBobinasCortadasService(pool, body);

    // 5. Responder con el resultado de la operación (HTTP 200 OK)
    return NextResponse.json(
      {
        success: true,
        message: "Colada actualizada correctamente en las bobinas cortadas.",
        data: resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/bobinas-cortadas/actualizar-colada:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar la colada.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}