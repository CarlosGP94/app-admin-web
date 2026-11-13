import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import {
  generarExcelProduccionMallasService,
  SinDatosProduccionError,
} from "@/lib/services/mallas/producciones-excel.service";

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseNumberList(
  searchParams: URLSearchParams,
  key: string
): number[] {
  const values = searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value !== "")
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0);

  return Array.from(new Set(values));
}

function esFechaValida(value: string): boolean {
  if (!FECHA_REGEX.test(value)) return false;

  const [anio, mes, dia] = value.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  return (
    fecha.getFullYear() === anio &&
    fecha.getMonth() === mes - 1 &&
    fecha.getDate() === dia
  );
}

/**
 * GET: Genera el Excel de producción de mallas filtrado por máquinas,
 * diámetros y rango de fechas.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    if (!searchParams.get("fechaInicio") || !searchParams.get("fechaFin")) {
      return NextResponse.json(
        {
          success: false,
          error: "El rango de fechas es obligatorio (fechaInicio y fechaFin).",
        },
        { status: 400 }
      );
    }

    const fechaInicio = searchParams.get("fechaInicio") as string;
    const fechaFin = searchParams.get("fechaFin") as string;

    if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
      return NextResponse.json(
        {
          success: false,
          error: "Las fechas deben tener el formato YYYY-MM-DD y ser válidas.",
        },
        { status: 400 }
      );
    }

    if (fechaInicio > fechaFin) {
      return NextResponse.json(
        {
          success: false,
          error: "La fecha de inicio no puede ser posterior a la fecha de fin.",
        },
        { status: 400 }
      );
    }

    const maquinaIds = parseNumberList(searchParams, "maquina_id");
    const diametros = parseNumberList(searchParams, "diametro");

    const pool = await getConnection();
    const excelBuffer = await generarExcelProduccionMallasService(pool, {
      maquina_ids: maquinaIds,
      diametros,
      fechaInicio,
      fechaFin,
    });

    const blob = new Blob([new Uint8Array(excelBuffer)]);

    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Reporte_Produccion_Mallas_${fechaInicio}_${fechaFin}.xlsx"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof SinDatosProduccionError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    console.error("❌ Error al exportar Excel de producción de mallas:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
