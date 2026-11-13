import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  certificadoRequestPayload,
  esImagenValida,
} from "@/lib/services/mallas/certificados.helpers";
import {
  crearCertificadoService,
  listarCertificadosService,
  ListarCertificadosParams,
} from "@/lib/services/mallas/certificados.service";
import {
  eliminarImagenCertificado,
  guardarImagenCertificado,
} from "@/lib/storage/certificados.storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Lista, pagina y ordena los certificados. No aplica filtros por fecha.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10);

    const orderByParam = searchParams.get("orderBy");
    let orderBy: "certificado" | "creado" | undefined = undefined;

    if (orderByParam === "certificado" || orderByParam === "creado") {
      orderBy = orderByParam;
    }

    const orderDir = searchParams.get("orderDir")?.toUpperCase() === "DESC"
      ? "DESC"
      : "ASC";

    const buscar = searchParams.get("search")?.trim() || undefined;

    const pool = await getConnection();

    const params: ListarCertificadosParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      buscar,
    };

    const resultado = await listarCertificadosService(pool, params);
    const totalPages = Math.ceil(resultado.total / pageSize);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.pageSize,
      totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/mallas/certificados:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de certificados.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * POST: Crea un certificado. Acepta multipart/form-data para subir la imagen.
 */
export async function POST(request: Request) {
  let imagenGuardada: string | null = null;

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

    if (imagen) {
      imagenGuardada = await guardarImagenCertificado(imagen);
    }

    const pool = await getConnection();
    const resultado = await crearCertificadoService(pool, {
      certificado,
      imagen: imagenGuardada,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Certificado creado correctamente.",
        data: resultado,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (imagenGuardada) {
      await eliminarImagenCertificado(imagenGuardada);
    }

    console.error("❌ Error en POST /api/mallas/certificados:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el certificado.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
