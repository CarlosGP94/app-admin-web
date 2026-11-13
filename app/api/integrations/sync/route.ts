import { NextResponse } from "next/server";
import { runIntegrationSync } from "@/lib/integrations/sync.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.SYNC_SECRET;
  if (!secret) return false;

  const provided = request.headers.get("x-sync-secret");
  return provided === secret;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "No autorizado." },
      { status: 401 }
    );
  }

  try {
    const result = await runIntegrationSync();
    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    console.error("❌ Error en POST /api/integrations/sync:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Error interno al sincronizar integraciones.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
