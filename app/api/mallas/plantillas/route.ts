import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  crearPlantillaService,
  ListarPlantillasParams,
  listarPlantillasService,
  PlantillaCreatePayload,
} from "@/lib/services/mallas/plantillas.service";

/**
 * GET: Lista, filtra, pagina y ordena las plantillas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10);

    // 2. Extraer y sanear ordenación (Columnas permitidas para Plantillas)
    const orderByParam = searchParams.get("orderBy");
    let orderBy: "nombre" | "titulo" | "creado" | undefined = undefined;

    if (
      orderByParam === "nombre" ||
      orderByParam === "titulo" ||
      orderByParam === "creado"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "DESC" ? "DESC" : "ASC";

    // 3. Extraer filtros específicos
    const buscar = searchParams.get("search") || undefined;

    // 4. Obtener el Connection Pool correspondiente
    const pool = await getConnection();

    // 5. Mapear parámetros al formato estricto del servicio
    const params: ListarPlantillasParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
      },
    };

    const resultado = await listarPlantillasService(pool, params);

    // 6. Calcular total de páginas para la respuesta
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
    console.error("❌ Error en GET /api/mallas/plantillas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de plantillas.";

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
 * POST: Crea una nueva plantilla
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: PlantillaCreatePayload = await request.json();

    // 2. Validación básica de campos requeridos
    if (
      !body.nombre ||
      !body.titulo ||
      !body.tipo ||
      !body.numero_varillas ||
      !body.peso ||
      !body.unidades_paquetes ||
      !body.lote ||
      !body.numero_paquetes
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos obligatorios son: nombre, titulo, tipo, numero_varillas, peso, unidades_paquetes, lote y numero_paquetes.",
        },
        { status: 400 }
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection();

    // 4. Ejecutar el servicio de creación
    const resultado = await crearPlantillaService(pool, body);

    // 5. Responder con el resultado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Plantilla creada correctamente.",
        data: resultado,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/mallas/plantillas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear la plantilla.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
