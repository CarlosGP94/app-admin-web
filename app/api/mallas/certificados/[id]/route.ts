import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  certificadoRequestPayload,
  esImagenValida,
} from "@/lib/services/mallas/certificados.helpers";
import {
  actualizarCertificadoService,
  eliminarCertificadoService,
  obtenerCertificadoPorIdService,
} from "@/lib/services/mallas/certificados.service";
import {
  eliminarImagenCertificado,
  guardarImagenCertificado,
} from "@/lib/storage/certificados.storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function parseId(rawId: string): number | null {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * GET: Obtener el detalle de un certificado por su ID.
 */
export async function GET(_request: Request, props: RouteParams) {
  try {
    const { id: rawId } = await props.params;
    const id = parseId(rawId);

    if (!id) {
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

    return NextResponse.json({ success: true, data: certificado });
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
 * PUT: Actualiza un certificado. Acepta multipart/form-data para reemplazar
 * la imagen.
 */
export async function PUT(request: Request, props: RouteParams) {
  const { id: rawId } = await props.params;
  const id = parseId(rawId);

  if (!id) {
    return NextResponse.json(
      { success: false, error: "El ID proporcionado no es válido." },
      { status: 400 }
    );
  }

  let imagenNueva: string | null = null;

  try {
    const { certificado, imagen } = await certificadoRequestPayload(request);

    if (!certificado) {
      return NextResponse.json(
        { success: false, error: "El nombre del certificado es obligatorio." },
        { status: 400 }
      );
    }

    if (!esImagenValida(imagen)) {
      return NextResponse.json(
        { success: false, error: "La imagen adjunta no es válida." },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const actual = await obtenerCertificadoPorIdService(pool, id);

    if (!actual) {
      return NextResponse.json(
        { success: false, error: "Certificado no encontrado." },
        { status: 404 }
      );
    }

    if (imagen) {
      imagenNueva = await guardarImagenCertificado(imagen);
    }

    const imagenFinal = imagenNueva ?? actual.imagen;
    const resultado = await actualizarCertificadoService(pool, {
      id,
      certificado,
      imagen: imagenFinal,
    });

    if (!resultado.actualizado) {
      if (imagenNueva) {
        await eliminarImagenCertificado(imagenNueva);
      }
      return NextResponse.json(
        { success: false, error: "Certificado no encontrado." },
        { status: 404 }
      );
    }

    if (imagenNueva && actual.imagen && actual.imagen !== imagenNueva) {
      await eliminarImagenCertificado(actual.imagen);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Certificado actualizado correctamente.",
        data: resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (imagenNueva) {
      await eliminarImagenCertificado(imagenNueva);
    }

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
 * DELETE: Elimina un certificado y su imagen asociada.
 */
export async function DELETE(_request: Request, props: RouteParams) {
  try {
    const { id: rawId } = await props.params;
    const id = parseId(rawId);

    if (!id) {
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

    await eliminarImagenCertificado(resultado.imagen);

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
