import mssql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const commonOptions = {
  encrypt: false,
  trustServerCertificate: true,
};

// 1. Configuración única para la base de datos de producción
const serverInput = process.env.DB_SERVER || "localhost";
const instanceNameInput = process.env.DB_INSTANCE;

// Separa el servidor y la instancia si vienen unidos por barra invertida (ej: "localhost\\SQLEXPRESS")
const server = serverInput.includes("\\")
  ? serverInput.split("\\")[0]
  : serverInput;
const instanceName =
  instanceNameInput ||
  (serverInput.includes("\\") ? serverInput.split("\\")[1] : undefined);

const config: mssql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: server,
  database: process.env.DB_DATABASE || "produccion",
  ...(instanceName ? {} : { port: Number(process.env.DB_PORT) || 1433 }),
  options: {
    ...commonOptions,
    ...(instanceName ? { instanceName } : {}),
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

// 2. Interfaz global para evitar duplicación de conexiones en desarrollo (Hot Reload de Next.js)
interface CustomGlobal {
  _mssqlPool?: Promise<mssql.ConnectionPool>;
}

const globalRef = global as unknown as CustomGlobal;

/**
 * Obtiene o inicializa el Connection Pool único para la base de datos de producción.
 */
export const getConnection = (): Promise<mssql.ConnectionPool> => {
  if (globalRef._mssqlPool) {
    return globalRef._mssqlPool;
  }

  globalRef._mssqlPool = new mssql.ConnectionPool(config)
    .connect()
    .then((pool) => {
      console.log(`\n========================================`);
      console.log(`✅ CONEXIÓN EXITOSA -> BASE DE DATOS: [PRODUCCIÓN]`);
      console.log(`📌 Servidor:  ${config.server}`);
      console.log(
        `📌 Instancia: ${
          config.options?.instanceName || "(Ninguna / Por defecto)"
        }`
      );
      console.log(
        `📌 Puerto:    ${
          config.port || "(Gestionado por SQL Browser / Instancia)"
        }`
      );
      console.log(`📌 Base Datos:${config.database}`);
      console.log(`📌 Usuario:   ${config.user}`);
      console.log(`========================================\n`);

      return pool;
    })
    .catch((err) => {
      console.error(`\n========================================`);
      console.error(`❌ ERROR DE CONEXIÓN -> BASE DE DATOS: [PRODUCCIÓN]`);
      console.error(`📌 Intentó conectar a: ${config.server}`);
      console.error(
        `📌 Instancia: ${config.options?.instanceName || "(Ninguna)"}`
      );
      console.error(`📌 Base Datos:${config.database}`);
      console.error(`📌 Usuario:   ${config.user}`);
      console.error(`📌 Detalle del error:`, err);
      console.error(`========================================\n`);

      delete globalRef._mssqlPool; // Limpiamos para poder reintentar
      throw err;
    });

  return globalRef._mssqlPool;
};

export { mssql };
