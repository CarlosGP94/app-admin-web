/**
 * Rutas de almacenamiento compartido. Se mantienen fuera de
 * `config/constants.ts` porque ese módulo también se usa en el cliente y
 * estas rutas solo deben resolverse en el servidor.
 */
export const storagePath =
  process.env.STORAGE_PATH || "\\\\DESKTOP-38CS798\\Imagenes";

export const certificadosImagesPath =
  process.env.CERTIFICADOS_IMAGES_PATH || `${storagePath}\\certificados`;
