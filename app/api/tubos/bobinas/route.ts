import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ActualizarBobinaDTO,
  actualizarBobinaService,
  CrearBobinaDTO,
  crearBobinaService,
  ListarBobinasParams,
  listarBobinasService,
} from "@/lib/services/bobinas.service"; // Ajusta la ruta a donde guardaste el servicio anterior

/**
 * GET: Lista, filtra, pagina y ordena las bobinas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10); // Usamos limit en la URL para mantener consistencia con tu UI

    // 2. Extraer y sanear ordenación (Solo permitimos las columnas válidas o dejamos undefined para el comportamiento por defecto)
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

    // 3. Extraer filtros específicos del módulo de bobinas
    const buscar = searchParams.get("search") || undefined;
    const calidadId = searchParams.get("calidad") || undefined;
    const fabricanteId = searchParams.get("fabricante") || undefined;

    // 4. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 5. Mapear parámetros al formato estricto que requiere el servicio
    const params: ListarBobinasParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        calidadId: calidadId ? Number(calidadId) : undefined,
        fabricanteId: fabricanteId ? Number(fabricanteId) : undefined,
      },
    };

    const resultado = await listarBobinasService(pool, params);

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
    console.error("❌ Error en GET /api/tubos/bobinas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de bobinas.";

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
 * POST: Crea una nueva bobina en la base de datos
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: CrearBobinaDTO = await request.json();

    // 2. Validación básica de campos requeridos
    if (
      !body.concepto ||
      !body.fabricante_id ||
      !body.calidad_id ||
      body.ancho === undefined ||
      body.espesor === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'concepto', 'fabricante_id', 'calidad_id', 'ancho' y 'espesor' son obligatorios.",
        },
        { status: 400 },
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio de creación
    const resultado = await crearBobinaService(pool, body);

    // 5. Responder con el resultado del registro creado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Bobina creada correctamente.",
        data: resultado,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/bobinas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear la bobina.";

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
// PUT: Actualizar Bobina existente
// ==========================================
export async function PUT(request: Request) {
  try {
    const body: ActualizarBobinaDTO = await request.json();

    if (
      !body.id ||
      !body.concepto ||
      !body.fabricante_id ||
      !body.calidad_id ||
      body.ancho === undefined ||
      body.espesor === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El 'id' y los campos 'concepto', 'fabricante_id', 'calidad_id', 'ancho' y 'espesor' son obligatorios.",
        },
        { status: 400 },
      );
    }

    const pool = await getConnection("tubos");
    const resultado = await actualizarBobinaService(pool, body);

    return NextResponse.json(
      {
        success: true,
        message: "Bobina actualizada correctamente.",
        data: resultado,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/bobinas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar la bobina.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
