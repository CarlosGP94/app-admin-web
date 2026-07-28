import { informeSalidaPaquetes } from "@/lib/services/informe-salida-paqs.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { fechaInicio, fechaFin } = body;

    // Generar el PDF según el rango de fechas opcional
    const pdfBuffer = await informeSalidaPaquetes({
      fechaInicio,
      fechaFin,
    });

    // Usamos una vista Uint8Array para evitar problemas de compatibilidad de tipos
    const uint8 = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="informe_salida_paquetes_${Date.now()}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error al generar el PDF de salida de paquetes:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
