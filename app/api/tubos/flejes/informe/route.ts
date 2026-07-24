import { NextResponse } from "next/server";
import { informeFlejes } from "@/lib/services/informe-flejes.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids } = body;

    // Generar el PDF (si ids viene undefined o [], generará el listado completo)
    const pdfBuffer = await informeFlejes({ ids });

    // Use a Uint8Array view of the Node Buffer to avoid SharedArrayBuffer typing issues
    const uint8 = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="informe_inventario_flejes_${Date.now()}.pdf"`,
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
