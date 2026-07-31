// app/api/tubos/coladas/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarColadasParaSeleccionarParams,
  listarColadasParaSeleccionarService,
} from "@/lib/services/bobinas-coladas.service";

/**
 * GET: Obtiene la lista de coladas a seleccionar con filtro opcional/requerido por fabricanteId
 */
export async function GET(request: Request) {
  try {
    // 1. Extraer los parámetros de búsqueda de la URL (?fabricanteId=123)
    const { searchParams } = new URL(request.url);
    const fabricanteIdRaw = searchParams.get("fabricanteId");

    if (!fabricanteIdRaw) {
      return NextResponse.json(
        {
          success: false,
          error: "El parámetro de consulta 'fabricanteId' es requerido.",
        },
        { status: 400 }
      );
    }

    const fabricanteId = Number(fabricanteIdRaw);

    if (isNaN(fabricanteId) || fabricanteId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El ID del fabricante debe ser un número entero válido.",
        },
        { status: 400 }
      );
    }

    // 2. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 3. Mapear parámetros al servicio
    const serviceParams: ListarColadasParaSeleccionarParams = {
      fabricanteId,
    };

    // 4. Ejecutar la consulta a través del servicio
    const coladas = await listarColadasParaSeleccionarService(
      pool,
      serviceParams
    );

    // 5. Devolver la respuesta con el formato estándar del proyecto
    return NextResponse.json({
      success: true,
      data: coladas,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/coladas:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al recuperar las coladas.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
