import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  crearCertificadoService,
  ListarCertificadosParams,
  listarCertificadosService,
  CertificadoCreatePayload,
} from "@/lib/services/mallas/certificados.service"; // Asegúrate de ajustar la ruta de importación de tus servicios

/**
 * GET: Lista, filtra, pagina y ordena los certificados
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10);

    // 2. Extraer y sanear ordenación (Columnas permitidas para Certificados)
    const orderByParam = searchParams.get("orderBy");
    let orderBy: "codigo" | "lote" | "creado" | undefined = undefined;

    if (
      orderByParam === "codigo" ||
      orderByParam === "lote" ||
      orderByParam === "creado"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "DESC" ? "DESC" : "ASC";

    // 3. Extraer filtros (búsqueda y rango de fechas de corte)
    const buscar = searchParams.get("search") || undefined;
    const fechaInicio = searchParams.get("fechaCorte_start") || undefined;
    const fechaFin = searchParams.get("fechaCorte_end") || undefined;

    // 4. Obtener el Connection Pool correspondiente
    const pool = await getConnection();

    // 5. Mapear parámetros al formato estricto que requiere el servicio
    const params: ListarCertificadosParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarCertificadosService(pool, params);

    // 6. Calcular total de páginas para la respuesta del frontend
    const totalPages = Math.ceil(resultado.total / pageSize);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.pageSize,
      totalPages: totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/mallas/certificados:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de certificados.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Crea un nuevo certificado
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: CertificadoCreatePayload = await request.json();

    // 2. Validación básica de campos requeridos
    if (!body.codigo || !body.lote) {
      return NextResponse.json(
        {
          success: false,
          error: "Los campos obligatorios son: codigo y lote.",
        },
        { status: 400 }
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection();

    // 4. Ejecutar el servicio de creación
    const resultado = await crearCertificadoService(pool, body);

    // 5. Responder con el resultado del registro creado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Certificado creado correctamente.",
        data: resultado,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/mallas/certificados:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el certificado.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
