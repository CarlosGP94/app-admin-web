// app/api/tubos/bobinas/[id]/coladas/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarBobinasColadasParams,
  listarBobinasColadasPorBobinaIdService,
} from "@/lib/services/bobinas-coladas.service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Obtiene la lista de coladas asociadas a una bobina específica
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // 1. Extraer y validar el ID de la bobina desde los parámetros de la URL
    const { id } = await params;
    const bobinaId = Number(id);

    if (isNaN(bobinaId) || bobinaId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El ID de la bobina debe ser un número entero válido.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al servicio
    const serviceParams: ListarBobinasColadasParams = {
      bobinaId,
    };

    // 4. Ejecutar la consulta a través del servicio
    const coladas = await listarBobinasColadasPorBobinaIdService(
      pool,
      serviceParams,
    );

    // 5. Devolver la respuesta con el formato estándar del proyecto
    return NextResponse.json({
      success: true,
      data: coladas,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/bobinas/[id]/coladas:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al recuperar las coladas de la bobina.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
