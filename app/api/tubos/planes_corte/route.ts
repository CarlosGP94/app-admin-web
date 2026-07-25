// app/api/tubos/planes_corte/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  listarPlanesCorteService,
  ListarPlanesCorteParams,
  crearPlanCorteService,
  ActualizarPlanCorteInput,
  actualizarPlanCorteService,
} from "@/lib/services/planes-corte.service";
import { planCorteSchema } from "@/components/tubos/planesCorte/PlanesCorteFormSchema";

interface FlejeInput {
  fleje_id: number;
  num_flejes: number;
  peso_unit_definido: number;
  factor_proporcional_peso: number;
  orden: number;
}

interface CrearPlanCorteInput {
  ancho_estipulado: number;
  flejes: FlejeInput[];
}

/**
 * GET: Lista, filtra, pagina y ordena los planes de corte
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación y orden
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(searchParams.get("limit")) || 10);

    const orderBy = searchParams.get("orderBy") || "id";
    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "ASC" ? "ASC" : "DESC";

    // 2. Extraer filtros de búsqueda y fechas
    const busqueda = searchParams.get("search") || undefined;
    const anchoEstipuladoParam = searchParams.get("ancho_estipulado");
    const ancho_estipulado = anchoEstipuladoParam
      ? Number(anchoEstipuladoParam)
      : undefined;
    const fechaInicio = searchParams.get("fechaCorte_start") || undefined;
    const fechaFin = searchParams.get("fechaCorte_end") || undefined;

    // 3. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 4. Mapear parámetros al formato estricto del servicio
    const params: ListarPlanesCorteParams = {
      page,
      limit,
      orderBy,
      orderDir,
      filtros: {
        busqueda,
        ancho_estipulado,
        fechaInicio,
        fechaFin,
      },
    };

    // 5. Llamar al servicio optimizado para SQL Server 2008
    const resultado = await listarPlanesCorteService(pool, params);

    // Retornamos la respuesta estandarizada
    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.limit,
      totalPages: resultado.totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/planes_corte:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar los planes de corte.";
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
 * POST: Crea un nuevo plan de corte con sus flejes asociados
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: CrearPlanCorteInput = await request.json();

    // 2. Validación de campos requeridos
    if (
      body.ancho_estipulado === undefined ||
      body.ancho_estipulado === null ||
      !Array.isArray(body.flejes) ||
      body.flejes.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El 'ancho_estipulado' y la lista de 'flejes' (al menos uno) son obligatorios.",
        },
        { status: 400 },
      );
    }

    // Validar que cada fleje tenga sus datos requeridos
    const flejeInvalido = body.flejes.some(
      (f: FlejeInput) =>
        !f.fleje_id ||
        !f.num_flejes ||
        f.peso_unit_definido === undefined ||
        f.factor_proporcional_peso === undefined,
    );

    if (flejeInvalido) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Todos los flejes deben incluir 'fleje_id', 'num_flejes', 'peso_unit_definido' y 'factor_proporcional_peso'.",
        },
        { status: 400 },
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio de creación (gestiona la transacción)
    const resultado = await crearPlanCorteService(pool, body);

    // 5. Responder con el resultado del registro creado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Plan de corte creado correctamente.",
        data: resultado,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/planes-corte:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el plan de corte.";

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
// PUT: Actualizar Plan de Corte existente
// ==========================================
export async function PUT(request: Request) {
  try {
    const rawBody = await request.json();

    // 1. Extraer ID del body (o de params si lo pasas en la URL)
    const { id, ...dataToValidate } = rawBody;

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "El campo 'id' es obligatorio y debe ser un número válido.",
        },
        { status: 400 },
      );
    }

    // 2. Validar el payload de datos usando el schema de Zod
    const validationResult = planCorteSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map((issue) => issue.message)
        .join(", ");

      return NextResponse.json(
        {
          success: false,
          error: `Datos del formulario inválidos: ${errorMessages}`,
        },
        { status: 400 },
      );
    }

    // 3. Preparar el DTO validado
    const updateInput: ActualizarPlanCorteInput = {
      id,
      ...validationResult.data,
    };

    // 4. Obtener pool de conexión y ejecutar servicio
    const pool = await getConnection("tubos");
    const resultado = await actualizarPlanCorteService(pool, updateInput);

    return NextResponse.json(
      {
        success: true,
        message: "Plan de corte actualizado correctamente.",
        data: resultado,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/planes-corte:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar el plan de corte.";

    // Si el error fue porque el ID no existe en DB, retornamos 404
    if (message.includes("no existe")) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
