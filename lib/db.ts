import mssql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const commonOptions = {
  encrypt: false,
  trustServerCertificate: true,
};

// 1. Definición clara de tus líneas de producción
export type LineaProduccion = "tubos" | "mallas" | "seguridad";

// 2. Configuraciones por línea de negocio adaptadas para instancias como SQLEXPRESS
const configs: Record<LineaProduccion, mssql.config> = {
  tubos: {
    user: process.env.DB_TUBOS_USER,
    password: process.env.DB_TUBOS_PASSWORD,
    server: process.env.DB_TUBOS_SERVER || "localhost",
    database: process.env.DB_TUBOS_DATABASE,
    // NOTA: Si hay instanceName, OMITIR el puerto 1433
    ...(process.env.DB_TUBOS_INSTANCE
      ? {}
      : { port: Number(process.env.DB_TUBOS_PORT) || 1433 }),
    options: {
      ...commonOptions,
      ...(process.env.DB_TUBOS_INSTANCE
        ? { instanceName: process.env.DB_TUBOS_INSTANCE }
        : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
  mallas: {
    user: process.env.DB_MALLAS_USER,
    password: process.env.DB_MALLAS_PASSWORD,
    // Si DB_MALLAS_SERVER="SQL\SQLSERVERGP", separa el servidor de la instancia
    server: process.env.DB_MALLAS_SERVER
      ? process.env.DB_MALLAS_SERVER.split("\\")[0]
      : "localhost",
    database: process.env.DB_MALLAS_DATABASE,
    ...(process.env.DB_MALLAS_INSTANCE
      ? {}
      : { port: Number(process.env.DB_MALLAS_PORT) || 1433 }),
    options: {
      ...commonOptions,
      ...(process.env.DB_MALLAS_INSTANCE ||
      process.env.DB_MALLAS_SERVER?.includes("\\")
        ? {
            instanceName:
              process.env.DB_MALLAS_INSTANCE ||
              process.env.DB_MALLAS_SERVER?.split("\\")[1],
          }
        : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
  seguridad: {
    user: process.env.DB_SEGURIDAD_USER,
    password: process.env.DB_SEGURIDAD_PASSWORD,
    server: process.env.DB_SEGURIDAD_SERVER || "localhost",
    database: process.env.DB_SEGURIDAD_DATABASE,
    ...(process.env.DB_SEGURIDAD_INSTANCE
      ? {}
      : { port: Number(process.env.DB_SEGURIDAD_PORT) || 1433 }),
    options: {
      ...commonOptions,
      ...(process.env.DB_SEGURIDAD_INSTANCE
        ? { instanceName: process.env.DB_SEGURIDAD_INSTANCE }
        : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
};

// Evitamos que Next.js duplique conexiones en desarrollo al recargar archivos (Hot Reload)
interface CustomGlobal {
  _mssqlPools?: Partial<Record<LineaProduccion, Promise<mssql.ConnectionPool>>>;
}

const globalRef = global as unknown as CustomGlobal;

if (!globalRef._mssqlPools) {
  globalRef._mssqlPools = {};
}

const pools = globalRef._mssqlPools;

/**
 * Obtiene el Connection Pool correspondiente a la línea de producción solicitada.
 * @param linea 'tubos' o 'mallas' o 'seguridad'
 */
export const getConnection = (
  linea: LineaProduccion,
): Promise<mssql.ConnectionPool> => {
  if (pools[linea]) {
    return pools[linea]!;
  }

  const config = configs[linea];
  if (!config) {
    throw new Error(
      `La configuración para la línea de producción '${linea}' no está definida.`,
    );
  }

  pools[linea] = new mssql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      // IMPRIMIR DETALLES DE LA CONEXIÓN ESTABLECIDA
      console.log(`\n========================================`);
      console.log(`✅ CONEXIÓN EXITOSA -> LÍNEA: [${linea.toUpperCase()}]`);
      console.log(`📌 Servidor:  ${config.server}`);
      console.log(
        `📌 Instancia: ${config.options?.instanceName || "(Ninguna / Por defecto)"}`,
      );
      console.log(
        `📌 Puerto:    ${config.port || "(Gestionado por SQL Browser / Instancia)"}`,
      );
      console.log(`📌 Base Datos:${config.database}`);
      console.log(`📌 Usuario:   ${config.user}`);
      console.log(`========================================\n`);

      return pool;
    })
    .catch((err) => {
      console.error(`\n========================================`);
      console.error(`❌ ERROR DE CONEXIÓN -> LÍNEA: [${linea.toUpperCase()}]`);
      console.error(`📌 Intentó conectar a: ${config.server}`);
      console.error(
        `📌 Instancia: ${config.options?.instanceName || "(Ninguna)"}`,
      );
      console.error(`📌 Base Datos:${config.database}`);
      console.error(`📌 Usuario:   ${config.user}`);
      console.error(`📌 Detalle del error:`, err);
      console.error(`========================================\n`);

      delete pools[linea]; // Limpiamos para poder reintentar
      throw err;
    });

  return pools[linea]!;
};

export { mssql };
