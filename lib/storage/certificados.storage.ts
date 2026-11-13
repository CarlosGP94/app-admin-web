import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { certificadosImagesPath } from "@/lib/storage/storage.config";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/bmp": ".bmp",
};

const ALLOWED_EXTENSIONS = new Set(Object.values(MIME_EXTENSION));

function extensionPara(file: File): string | null {
  const porMime = MIME_EXTENSION[file.type.toLowerCase()];
  if (porMime) return porMime;

  const porNombre = path.extname(file.name).toLowerCase();
  return ALLOWED_EXTENSIONS.has(porNombre) ? porNombre : null;
}

/**
 * Guarda una imagen de certificado en la ruta de almacenamiento compartida
 * configurada en CERTIFICADOS_IMAGES_PATH y devuelve el nombre del archivo
 * (sin ruta) que se persiste en la base de datos.
 */
export async function guardarImagenCertificado(file: File): Promise<string> {
  if (!file || file.size === 0) {
    throw new Error("El archivo de imagen está vacío.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen supera el tamaño máximo permitido de 10 MB.");
  }

  const extension = extensionPara(file);
  if (!extension) {
    throw new Error(
      "Formato de imagen no permitido. Usa PNG, JPG, JPEG, WEBP, GIF o BMP."
    );
  }

  await fs.mkdir(certificadosImagesPath, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await fs.writeFile(path.join(certificadosImagesPath, fileName), buffer);

  return fileName;
}

/**
 * Elimina una imagen de certificado del almacenamiento. Es tolerante a
 * archivos inexistentes para no romper el flujo de eliminación.
 */
export async function eliminarImagenCertificado(
  fileName?: string | null
): Promise<void> {
  if (!fileName) return;

  const safeName = path.basename(fileName);
  const filePath = path.join(certificadosImagesPath, safeName);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.error(
        `⚠️ No se pudo eliminar la imagen del certificado "${filePath}":`,
        error
      );
    }
  }
}
