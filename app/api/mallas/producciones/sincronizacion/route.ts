import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ProduccionMallaCreatePayload,
  crearProduccionesMallaBatchService,
} from "@/lib/services/mallas/producciones.service";

/**
 * POST: Registra una o múltiples producciones de mallas enviadas desde el script de la máquina.
 */
export async function POST(request: Request) {
  try {
    // 1. Obtener y parsear el cuerpo de la petición
    const body = await request.json();

    // Soportar tanto un objeto único como un array de elementos
    const items: ProduccionMallaCreatePayload[] = Array.isArray(body)
      ? body
      : [body];

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El cuerpo de la petición está vacío o no es válido.",
        },
        { status: 400 }
      );
    }

    // 2. Obtener el Connection Pool
    const pool = await getConnection();

    // 3. Invocar el servicio batch para insertar todos los elementos en una transacción
    const resultados = await crearProduccionesMallaBatchService(pool, items);

    // 4. Responder con éxito
    return NextResponse.json(
      {
        success: true,
        message: `${resultados.length} registro(s) de producción procesado(s) con éxito.`,
        data: resultados,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/produccion:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al registrar la producción de mallas.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
