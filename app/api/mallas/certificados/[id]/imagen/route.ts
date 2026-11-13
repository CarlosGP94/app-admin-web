import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getConnection } from "@/lib/db";
import { certificadosImagesPath } from "@/lib/storage/storage.config";
import { obtenerCertificadoImagenService } from "@/lib/services/mallas/certificados.service";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET: Devuelve el archivo de imagen del certificado indicado, leído desde
 * la ruta de almacenamiento compartida configurada.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, error: "ID de certificado inválido." },
      { status: 400 }
    );
  }

  try {
    const pool = await getConnection();
    const certificado = await obtenerCertificadoImagenService(pool, id);

    if (!certificado || !certificado.imagen) {
      return NextResponse.json(
        { success: false, error: "El certificado no tiene una imagen asociada." },
        { status: 404 }
      );
    }

    // Solo el nombre del archivo para evitar rutas arbitrarias
    const fileName = path.basename(certificado.imagen);
    const filePath = path.join(certificadosImagesPath, fileName);

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch (error) {
      console.error(
        `❌ No se pudo leer la imagen del certificado ${id} en "${filePath}":`,
        error
      );
      return NextResponse.json(
        { success: false, error: "No se encontró el archivo de la imagen." },
        { status: 404 }
      );
    }

    const extension = path.extname(fileName).toLowerCase();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": MIME_BY_EXT[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    console.error(
      `❌ Error en GET /api/mallas/certificados/[id]/imagen:`,
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener la imagen del certificado.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
