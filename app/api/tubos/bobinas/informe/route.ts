import { informeBobinas } from "@/lib/services/informe-bobinas.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    // Generar el PDF (si ids viene undefined o [], generará el listado completo)
    const pdfBuffer = await informeBobinas({ ids });

    // Use a Uint8Array view of the Node Buffer to avoid SharedArrayBuffer typing issues
    const uint8 = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="informe_inventario_bobinas_${Date.now()}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error al generar el PDF de inventario:", error);

    return NextResponse.json(
      {
        success: false,
        error: error,
      },
      { status: 500 },
    );
  }
}
