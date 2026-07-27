// app/api/tubos/planes_corte/route.ts
import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  actualizarProduccionTuboService,
  crearProduccionService,
  ListarProdTubosParams,
  listarProdTubosService,
  ProduccionCreatePayload,
  ProduccionTuboUpdatePayload,
} from "@/lib/services/produccion.service";

/**
 * GET: Lista, filtra, pagina y ordena las bobinas cortadas
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
    const espesor = searchParams.get("espesor") || undefined;
    const calidad = searchParams.get("calidad") || undefined;
    const turno = searchParams.get("turno") || undefined;
    const estructural = searchParams.get("estructural") || undefined;
    const operario = searchParams.get("operario") || undefined;
    const maquina = searchParams.get("maquina") || undefined;
    const fechaInicio = searchParams.get("fechaCorte_start") || undefined;
    const fechaFin = searchParams.get("fechaCorte_end") || undefined;

    // 3. Obtener el Connection Pool correspondiente a la línea de tubos
    const pool = await getConnection("tubos");

    // 4. Mapear parámetros al formato estricto del servicio
    const params: ListarProdTubosParams = {
      page,
      limit,
      orderBy,
      orderDir,
      filtros: {
        busqueda,
        espesor: espesor ? Number(espesor) : undefined,
        calidad: calidad ? Number(calidad) : undefined,
        turno: turno ? Number(turno) : undefined,
        estructural:
          estructural === "1" ? true : estructural === "2" ? false : undefined,
        operario: operario ? Number(operario) : undefined,
        maquina: maquina ? Number(maquina) : undefined,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarProdTubosService(pool, params);

    return NextResponse.json({
      success: true,
      data: resultado.data,
      total: resultado.total,
      page: resultado.page,
      limit: resultado.limit,
      totalPages: resultado.totalPages,
    });
  } catch (error: unknown) {
    console.error("❌ Error en GET /api/tubos/produccion:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar las producciones de tubos.";
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
 * POST: Crea una nueva orden de producción
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: ProduccionCreatePayload = await request.json();

    // 2. Validación de campos requeridos
    if (
      !body.tubo_id ||
      !body.maquina_id ||
      !body.fleje_id ||
      body.unidades_objetivo === undefined ||
      body.unidades_objetivo === null ||
      body.unidades_objetivo <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'tubo_id', 'maquina_id', 'fleje_id' y 'unidades_objetivo' (mayor a 0) son obligatorios.",
        },
        { status: 400 },
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection("tubos");

    // 4. Ejecutar el servicio de creación (gestiona la transacción)
    const resultado = await crearProduccionService(pool, body);

    // 5. Responder con el resultado del registro creado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Orden de producción creada correctamente.",
        data: resultado,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/produccion:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear la orden de producción.";

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
// PUT: Actualizar Registro de Producción de Tubo
// ==========================================
export async function PUT(request: Request) {
  try {
    const body: ProduccionTuboUpdatePayload = await request.json();

    // Validaciones básicas de campos obligatorios
    if (!body.id || !body.tubo_id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos 'id' y 'tubo_id' son obligatorios para actualizar la producción.",
        },
        { status: 400 },
      );
    }

    if (body.cant_tubos_buenos === undefined || body.cant_tubos_buenos < 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El campo 'tubos_buenos' es obligatorio y no puede ser un número negativo.",
        },
        { status: 400 },
      );
    }

    // Conexión y ejecución del servicio dentro de la transacción
    const pool = await getConnection("tubos");
    const resultado = await actualizarProduccionTuboService(pool, body);

    return NextResponse.json(
      {
        success: true,
        message: resultado.mensaje,
        data: resultado,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("❌ Error en PUT /api/tubos/produccion:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al actualizar la producción de tubo.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
