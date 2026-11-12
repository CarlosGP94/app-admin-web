import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarEtiquetasParams,
  listarEtiquetasService,
  crearEtiquetaService,
  EtiquetaCreatePayload,
} from "@/lib/services/mallas/etiquetas.service";

/**
 * GET: Lista, filtra, pagina y ordena las etiquetas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10);

    // 2. Extraer y sanear ordenación (Columnas permitidas para Etiquetas)
    const orderByParam = searchParams.get("orderBy");
    let orderBy: "lote" | "no_paquete" | "creado" | undefined = undefined;

    if (
      orderByParam === "lote" ||
      orderByParam === "no_paquete" ||
      orderByParam === "creado"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "ASC" ? "ASC" : "DESC";

    // 3. Extraer filtros específicos del módulo de etiquetas
    const buscar = searchParams.get("search") || undefined;
    const maquina_id = searchParams.get("maquina_id")
      ? Number(searchParams.get("maquina_id"))
      : undefined;
    const turno_id = searchParams.get("turno_id")
      ? Number(searchParams.get("turno_id"))
      : undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 4. Obtener el Connection Pool correspondiente
    const pool = await getConnection();

    // 5. Mapear parámetros al formato estricto que requiere el servicio
    const params: ListarEtiquetasParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        maquina_id,
        turno_id,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarEtiquetasService(pool, params);

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
    console.error("❌ Error en GET /api/produccion/etiquetas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de etiquetas.";

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
 * POST: Crea un nuevo registro de etiqueta
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: EtiquetaCreatePayload = await request.json();

    // 2. Validación básica de campos requeridos según la tabla de etiquetas
    if (
      !body.maquina_id ||
      !body.turno_id ||
      !body.malla_id ||
      body.no_paquete === undefined ||
      !body.lote
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos obligatorios son: maquina_id, turno_id, malla_id, no_paquete y lote.",
        },
        { status: 400 }
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection();

    // 4. Ejecutar el servicio de creación
    const resultado = await crearEtiquetaService(pool, body);

    // 5. Responder con el resultado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Etiqueta creada correctamente.",
        data: resultado,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/produccion/etiquetas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el registro de etiqueta.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
