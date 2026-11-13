import type { SqliteTarget } from "@/lib/integrations/types";
import { mallasEntity } from "@/lib/integrations/entities/mallas.entity";

const DEFAULT_LOCAL_PRODUCCION_PATH =
  "\\\\192.168.1.94\\Users\\M9\\Documents\\produccion mallas\\M9\\local_produccion.db";

/**
 * Registro de destinos externos. Para agregar una nueva base SQLite
 * solo hay que añadir otro elemento al arreglo (con sus entidades).
 */
export const targetRegistry: SqliteTarget[] = [
  {
    name: "local_produccion",
    enabled: process.env.SQLITE_LOCAL_PRODUCCION_ENABLED !== "false",
    driver: "sqlite",
    path:
      process.env.SQLITE_LOCAL_PRODUCCION_PATH ||
      DEFAULT_LOCAL_PRODUCCION_PATH,
    entities: [mallasEntity],
  },
  // Ejemplo para una futura base adicional:
  // {
  //   name: "local_produccion_2",
  //   enabled: process.env.SQLITE_LOCAL_PRODUCCION_2_ENABLED !== "false",
  //   driver: "sqlite",
  //   path: process.env.SQLITE_LOCAL_PRODUCCION_2_PATH || "\\\\PC\\ruta\\db.db",
  //   entities: [mallasEntity],
  // },
];
