import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db"; // Ajusta el path de tu pool de conexión
import { getUserByIdService } from "@/lib/services/auth.service";

/**
 * GET: Obtiene la información actualizada de un usuario por su ID
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear el id del usuario desde la query string (?userId=X o ?id=X)
    const userIdParam = searchParams.get("userId") || searchParams.get("id");
    const userId = Number(userIdParam);

    if (!userIdParam || isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El parámetro 'userId' es obligatorio y debe ser un número entero válido.",
        },
        { status: 400 },
      );
    }

    // 2. Obtener la conexión a la base de datos (seguridad o tubos según corresponda)
    const pool = await getConnection("seguridad");

    // 3. Ejecutar el servicio de consulta del usuario
    const usuario = await getUserByIdService(pool, userId);

    // 4. Responder con la información del usuario obtenida (HTTP 200 OK)
    return NextResponse.json({
      success: true,
      data: usuario,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/auth/me:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al obtener la información del usuario.";

    // Si el usuario no existe o está desactivado
    const status = message.includes("no encontrado") ? 404 : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status },
    );
  }
}
