import { runProductionQueueSync } from "@/lib/integrations/queue-sync.service";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

interface SchedulerGlobal {
  _colaProduccionInterval?: NodeJS.Timeout;
}

function intervaloMs(): number {
  const configured = Number(process.env.COLA_PRODUCCION_SYNC_INTERVAL_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_INTERVAL_MS;
}

function ejecutar(): void {
  void runProductionQueueSync().catch((error) => {
    console.error("❌ Error en el vaciado periódico de cola_produccion:", error);
  });
}

/**
 * Inicia el vaciado periódico de la cola de producción local hacia SQL Server.
 * Se ejecuta al arrancar y luego cada 10 minutos (configurable con
 * COLA_PRODUCCION_SYNC_INTERVAL_MS). Evita registros duplicados si Next.js
 * vuelve a ejecutar el registro de instrumentación.
 */
export function startProductionQueueScheduler(): void {
  if (process.env.COLA_PRODUCCION_SYNC_ENABLED === "false") {
    console.log("ℹ️ Vaciado de cola_produccion deshabilitado por entorno.");
    return;
  }

  const globalRef = global as unknown as SchedulerGlobal;
  if (globalRef._colaProduccionInterval) return;

  ejecutar();

  const interval = setInterval(ejecutar, intervaloMs());
  interval.unref?.();
  globalRef._colaProduccionInterval = interval;

  console.log(
    `⏱️ Vaciado de cola_produccion programado cada ${Math.round(
      intervaloMs() / 60000
    )} minuto(s).`
  );
}
