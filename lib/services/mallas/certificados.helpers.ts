export interface CertificadoRequestPayload {
  certificado: string;
  imagen: File | null;
}

function archivoDesde(value: FormDataEntryValue | null): File | null {
  if (typeof value === "object" && value !== null && value instanceof File) {
    return value.size > 0 ? value : null;
  }
  return null;
}

/**
 * Extrae el nombre del certificado y, opcionalmente, la imagen desde una
 * petición multipart/form-data o JSON.
 */
export async function certificadoRequestPayload(
  request: Request
): Promise<CertificadoRequestPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    return {
      certificado: String(form.get("certificado") ?? "").trim(),
      imagen: archivoDesde(form.get("imagen")),
    };
  }

  const body = (await request.json().catch(() => ({}))) as {
    certificado?: unknown;
    codigo?: unknown;
  };
  const certificado = body.certificado ?? body.codigo;

  return {
    certificado: typeof certificado === "string" ? certificado.trim() : "",
    imagen: null,
  };
}

export function esImagenValida(imagen: File | null): boolean {
  if (!imagen) return true;
  return imagen.type === "" || imagen.type.startsWith("image/");
}
