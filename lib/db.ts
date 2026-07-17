import mssql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const commonOptions = {
  encrypt: false,
  trustServerCertificate: true,
};

// 1. Definición clara de tus líneas de producción
export type LineaProduccion = "tubos" | "mallas";

// 2. Configuraciones por línea de negocio adaptadas para instancias como SQLEXPRESS
const configs: Record<LineaProduccion, mssql.config> = {
  tubos: {
    user: process.env.DB_TUBOS_USER,
    password: process.env.DB_TUBOS_PASSWORD,
    server: process.env.DB_TUBOS_SERVER || "localhost",
    database: process.env.DB_TUBOS_DATABASE,
    port: Number(process.env.DB_TUBOS_PORT) || 1433,
    options: {
      ...commonOptions,
      // Si existe una instancia (ej: SQLEXPRESS), la inyectamos aquí
      ...(process.env.DB_TUBOS_INSTANCE
        ? { instanceName: process.env.DB_TUBOS_INSTANCE }
        : {}),
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  },
  mallas: {
    user: process.env.DB_MALLAS_USER,
    password: process.env.DB_MALLAS_PASSWORD,
    server: process.env.DB_MALLAS_SERVER || "localhost",
    database: process.env.DB_MALLAS_DATABASE,
    port: Number(process.env.DB_MALLAS_PORT) || 1433,
    options: {
      ...commonOptions,
      ...(process.env.DB_MALLAS_INSTANCE
        ? { instanceName: process.env.DB_MALLAS_INSTANCE }
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
 * @param linea 'tubos' o 'mallas'
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
      console.log(
        `✅ Conexión establecida -> LÍNEA: [${linea.toUpperCase()}] (BD: ${config.database})`,
      );
      return pool;
    })
    .catch((err) => {
      console.error(
        `❌ Error al conectar con la base de datos de la línea '${linea}':`,
        err,
      );
      delete pools[linea]; // Limpiamos para poder reintentar
      throw err;
    });

  return pools[linea]!;
};

export { mssql };
