import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  ListarProduccionMallasParams,
  listarProduccionMallasService,
  crearProduccionMallaService,
  ProduccionMallaCreatePayload,
} from "@/lib/services/mallas/producciones.service";

/**
 * GET: Lista, filtra, pagina y ordena la producción de mallas
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Extraer y sanear parámetros de paginación (coherencia con 'limit')
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.max(1, Number(searchParams.get("limit")) || 10);

    // 2. Extraer y sanear ordenación (Columnas permitidas para Producción)
    const orderByParam = searchParams.get("orderBy");
    let orderBy:
      | "lote"
      | "paquete"
      | "diametro"
      | "ancho"
      | "largo"
      | "unidades"
      | "creado"
      | undefined = undefined;

    if (
      orderByParam === "lote" ||
      orderByParam === "paquete" ||
      orderByParam === "diametro" ||
      orderByParam === "ancho" ||
      orderByParam === "largo" ||
      orderByParam === "unidades" ||
      orderByParam === "creado"
    ) {
      orderBy = orderByParam;
    }

    const orderDirParam = searchParams.get("orderDir")?.toUpperCase();
    const orderDir = orderDirParam === "ASC" ? "ASC" : "DESC";

    // 3. Extraer filtros específicos del módulo de producción
    const buscar = searchParams.get("search") || undefined;
    const maquina_id = searchParams.get("maquina_id")
      ? Number(searchParams.get("maquina_id"))
      : undefined;
    const diametro = searchParams.get("diametro")
      ? Number(searchParams.get("diametro"))
      : undefined;
    const fechaInicio = searchParams.get("fechaInicio") || undefined;
    const fechaFin = searchParams.get("fechaFin") || undefined;

    // 4. Obtener el Connection Pool correspondiente
    const pool = await getConnection();

    // 5. Mapear parámetros al formato estricto que requiere el servicio
    const params: ListarProduccionMallasParams = {
      page,
      pageSize,
      orderBy,
      orderDir,
      filtros: {
        buscar,
        maquina_id,
        diametro,
        fechaInicio,
        fechaFin,
      },
    };

    const resultado = await listarProduccionMallasService(pool, params);

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
    console.error("❌ Error en GET /api/produccion/mallas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al procesar el listado de producción.";

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
 * POST: Crea un nuevo registro de producción de mallas
 */
export async function POST(request: Request) {
  try {
    // 1. Parsear el cuerpo de la petición
    const body: ProduccionMallaCreatePayload = await request.json();

    // 2. Validación básica de campos requeridos según la tabla de producción
    if (
      !body.turno_id ||
      !body.malla_id ||
      !body.paquete ||
      !body.lote ||
      body.unidades === undefined ||
      body.sl === undefined ||
      body.st === undefined ||
      body.longitudinales === undefined ||
      body.transversales === undefined ||
      !body.diametro ||
      body.ancho === undefined ||
      body.largo === undefined ||
      !body.maquina_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Los campos obligatorios son: turno_id, malla_id, paquete, lote, unidades, sl, st, longitudinales, transversales, diametro, ancho, largo y maquina_id.",
        },
        { status: 400 }
      );
    }

    // 3. Obtener la conexión a la base de datos
    const pool = await getConnection();

    // 4. Ejecutar el servicio de creación
    const resultado = await crearProduccionMallaService(pool, body);

    // 5. Responder con el resultado (HTTP 201 Created)
    return NextResponse.json(
      {
        success: true,
        message: "Producción de malla creada correctamente.",
        data: resultado,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/produccion/mallas:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno del servidor al crear el registro de producción.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
