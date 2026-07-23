import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarFlejesParams,
  listarFlejesService,
  crearFlejeService,
  CrearFlejeDTO,
  actualizarFlejeService,
  ActualizarFlejeDTO,
} from "@/lib/services/flejes.service"; // Ajusta la ruta a donde guardaste el servicio de flejes

/**
 * GET: Lista, filtra, pagina y ordena los flejes
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10); // Manteniendo consistencia con la UI usando 'limit'

    // 2. Extraer y sanear ordenación (Validación de columnas permitidas)
    const orderByParam = searchParams.get("orderBy");
    let orderBy: "unidades" | "peso_medio" | "concepto" | undefined = undefined;

    if (
      orderByParam === "unidades" ||
      orderByParam === "peso_medio" ||
      orderByParam === "concepto"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "DESC" ? "DESC" : "ASC";

    // 3. Extraer filtros específicos del módulo de flejes
    const buscar = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidad") || undefined;
    const espesor = searchParams.get("espesor") || undefined;

    // 4. Obtener el Connection Pool correspondiente a la línea de producción
    const pool = await getConnection("tubos");

    // 5. Mapear parámetros al formato estricto del servicio de flejes
    const params: ListarFlejesParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        calidadId: calidadId ? Number(calidadId) : undefined,
        espesor: espesor ? Number(espesor) : undefined,
      },
    };

    const resultado = await listarFlejesService(pool, params);

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
    console.error("❌ Error en GET /api/tubos/flejes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de flejes.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

/**
 * POST: Crea un nuevo fleje en la base de datos
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: CrearFlejeDTO = await request.json();

    // 2. Validación básica de campos requeridos
    if (
      !body.concepto ||
      !body.calidad_id ||
      body.ancho === undefined ||
      body.espesor === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'concepto', 'calidad_id', 'ancho' y 'espesor' son obligatorios.",
        },
        { status: 400 },
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio de creación
    const resultado = await crearFlejeService(pool, body);

    // 5. Responder con el resultado del registro creado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Fleje creado correctamente.",
        data: resultado,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/flejes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el fleje.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

// ==========================================
// PUT: Actualizar Fleje existente
// ==========================================
export async function PUT(request: Request) {
  try {
    const body: ActualizarFlejeDTO = await request.json();

    if (
      !body.id ||
      !body.concepto ||
      !body.calidad_id ||
      body.ancho === undefined ||
      body.espesor === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El 'id' y los campos 'concepto', 'calidad_id', 'ancho' y 'espesor' son obligatorios.",
        },
        { status: 400 },
      );
    }

    const pool = await getConnection("tubos");
    const resultado = await actualizarFlejeService(pool, body);

    return NextResponse.json(
      {
        success: true,
        message: "Fleje actualizado correctamente.",
        data: resultado,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/flejes:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar el fleje.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
