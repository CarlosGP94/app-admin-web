import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  actualizarCertificadoService,
  eliminarCertificadoService,
  obtenerCertificadoPorIdService,
  CertificadoUpdatePayload,
} from "@/lib/services/mallas/certificados.service"; // Ajusta la ruta según la ubicación de tus servicios

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET: Obtener el detalle de un certificado por su ID
 */
export async function GET(request: Request, props: RouteParams) {
  try {
    const params = await props.params;
    const id = Number(params.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "El ID proporcionado no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const certificado = await obtenerCertificadoPorIdService(pool, id);

    if (!certificado) {
      return NextResponse.json(
        { success: false, error: "Certificado no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: certificado,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/mallas/certificados/[id]:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno al obtener el certificado.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT: Actualizar un certificado existente
 */
export async function PUT(request: Request, props: RouteParams) {
  try {
    const routeParams = await props.params;
    const id = Number(routeParams.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "El ID proporcionado no es válido." },
        { status: 400 }
      );
    }

    const body: Omit<CertificadoUpdatePayload, "id"> = await request.json();

    // Validación básica de campos requeridos
    if (!body.codigo || !body.lote) {
      return NextResponse.json(
        {
          success: false,
          error: "Los campos obligatorios son: codigo y lote.",
        },
        { status: 400 }
      );
    }

    const payload: CertificadoUpdatePayload = {
      id,
      ...body,
    };

    const pool = await getConnection();
    const resultado = await actualizarCertificadoService(pool, payload);

    return NextResponse.json(
      {
        success: true,
        message: "Certificado actualizado correctamente.",
        data: resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/mallas/certificados/[id]:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno al actualizar el certificado.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Eliminar un certificado por su ID
 */
export async function DELETE(request: Request, props: RouteParams) {
  try {
    const params = await props.params;
    const id = Number(params.id);

    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { success: false, error: "El ID proporcionado no es válido." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await eliminarCertificadoService(pool, id);

    if (!resultado.eliminado) {
      return NextResponse.json(
        {
          success: false,
          error: "El certificado no existe o ya fue eliminado.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Certificado eliminado correctamente.",
      data: resultado,
    });
  } catch (error: unknown) {
    console.error("❌ Error en DELETE /api/mallas/certificados/[id]:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno al eliminar el certificado.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
