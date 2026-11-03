import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  actualizarMallaService,
  crearMallaService,
  ListarMallasParams,
  listarMallasService,
  MallaCreatePayload,
  MallaUpdatePayload,
} from "@/lib/services/mallas/mallas.service";

/**
 * GET: Lista, filtra, pagina y ordena los tubos
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10); // Consistencia con la UI usando 'limit'

    // 2. Extraer y sanear ordenación (Columnas permitidas para Tubos)
    const orderByParam = searchParams.get("orderBy");
    let orderBy:
      | "largo"
      | "ancho"
      | "longitudinales"
      | "transversales"
      | "art_concepto"
      | "codigo"
      | "art_codigo"
      | "diametro"
      | undefined = undefined;

    if (
      orderByParam === "largo" ||
      orderByParam === "ancho" ||
      orderByParam === "transversales" ||
      orderByParam === "longitudinales"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "DESC" ? "DESC" : "ASC";

    // 3. Extraer filtros específicos del módulo de tubos
    const buscar = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidad") || undefined;
    const tipoId = searchParams.get("tipo") || undefined;
    const espesor = searchParams.get("espesor") || undefined;

    // 4. Obtener el Connection Pool correspondiente
    const pool = await getConnection();

    // 5. Mapear parámetros al formato estricto que requiere el servicio de tubos
    const params: ListarMallasParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
      },
    };

    const resultado = await listarMallasService(pool, params);

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
    console.error("❌ Error en GET /api/mallas/mallas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de tubos.";

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
 * POST: Crea un nuevo tubo y registra sus configuraciones de máquinas/flejes
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: MallaCreatePayload = await request.json();

    // 2. Validación básica de campos requeridos
    if (
      !body.art_concepto ||
      !body.codigo ||
      !body.art_codigo ||
      !body.designacion ||
      !body.diametro ||
      !body.longitudinales ||
      !body.transversales ||
      !body.largo ||
      !body.ancho ||
      !body.sl ||
      !body.st
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'obligatorios' son: art_concepto, codigo, art_codigo, designacion, diametro, longitudinales, transversales, largo, ancho, sl y st.",
        },
        { status: 400 }
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection();

    // 4. Ejecutar el servicio de creación
    const resultado = await crearMallaService(pool, body);

    // 5. Responder con el resultado del registro creado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Malla creado correctamente.",
        data: resultado,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/mallas/mallas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el malla.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}

// ==========================================
// PUT: Actualizar Malla existente
// ==========================================
export async function PUT(request: Request) {
  try {
    const body: MallaUpdatePayload = await request.json();

    // 2. Validación básica de campos requeridos
    if (
      !body.art_concepto ||
      !body.codigo ||
      !body.art_codigo ||
      !body.designacion ||
      !body.diametro ||
      !body.longitudinales ||
      !body.transversales ||
      !body.largo ||
      !body.ancho ||
      !body.sl ||
      !body.st
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'obligatorios' son: art_concepto, codigo, art_codigo, designacion, diametro, longitudinales, transversales, largo, ancho, sl y st.",
        },
        { status: 400 }
      );
    }

    const pool = await getConnection();
    const resultado = await actualizarMallaService(pool, body);

    return NextResponse.json(
      {
        success: true,
        message: "Malla actualizado correctamente.",
        data: resultado,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/mallas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar la malla.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
