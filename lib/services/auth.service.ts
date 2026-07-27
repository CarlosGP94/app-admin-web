import { PermissionCode, User } from "@/types/auth";
import { ConnectionPool } from "mssql";

/**
 * Valida si el usuario tiene un permiso específico.
 */
export const hasPermission = (
  user: User | null,
  requiredPermission?: PermissionCode,
): boolean => {
  if (!requiredPermission) return true;
  if (!user || !user.permisos) return false;

  return user.permisos.includes(requiredPermission);
};

/**
 * Valida si el usuario posee al menos uno de los permisos requeridos.
 */
export const hasAnyPermission = (
  user: User | null,
  requiredPermissions: PermissionCode[],
): boolean => {
  if (!user || !user.permisos) return false;

  return requiredPermissions.some((perm) => user.permisos.includes(perm));
};

export interface LoginCredentials {
  username: string;
  password_hash: string;
}

// DTO para la petición de login
export interface LoginDTO {
  usuario: string;
  password: string;
}

// Datos del usuario que se retornan tras una autenticación exitosa (incluyendo sus permisos)
export interface UsuarioAuth {
  id: number;
  usuario: string;
  nombre: string;
  cargo?: string;
  rol_id: number;
  rol_nombre?: string;
  activo: boolean;
  password_hash: string;
  permisos: PermissionCode[];
}

export interface LoginResponse {
  usuario: Omit<UsuarioAuth, "password_hash">;
}

/**
 * Servicio para autenticar un usuario en la base de datos y obtener sus permisos.
 */
export async function loginService(
  pool: ConnectionPool,
  credentials: LoginDTO,
): Promise<UsuarioAuth> {
  const usuarioLimpio = credentials.usuario.trim();

  const req = pool.request();
  req.input("usuario", usuarioLimpio);

  // Consulta que conecta Usuarios -> Usuario_Roles -> Roles -> Rol_Permisos -> Permisos
  const query = `
    SELECT 
      u.id,
      u.usuario,
      u.nombre,
      u.password_hash,
      u.activo,
      u.cargo,
      r.id AS rol_id,
      r.nombre AS rol_nombre,
      p.codigo AS permiso_codigo
    FROM usuarios u
    LEFT JOIN Usuario_Roles ur ON u.id = ur.usuario_id
    LEFT JOIN Roles r ON ur.rol_id = r.id
    LEFT JOIN Rol_Permisos rp ON r.id = rp.rol_id
    LEFT JOIN Permisos p ON rp.permiso_id = p.id
    WHERE u.usuario = @usuario;
  `;

  const resultado = await req.query(query);

  if (resultado.recordset.length === 0) {
    throw new Error("Credenciales inválidas.");
  }

  const rows = resultado.recordset;
  const primerRegistro = rows[0];

  // Validar si la cuenta está activa
  if (!primerRegistro.activo) {
    throw new Error(
      "El usuario se encuentra desactivado. Contacte al administrador.",
    );
  }

  // Extraer el listado de códigos de permisos únicos (filtrando nulos)
  const permisosUnicos = Array.from(
    new Set(
      rows
        .map((row) => row.permiso_codigo as PermissionCode)
        .filter((codigo): codigo is PermissionCode => Boolean(codigo)),
    ),
  );

  return {
    id: primerRegistro.id,
    usuario: primerRegistro.usuario,
    nombre: primerRegistro.nombre,
    rol_id: primerRegistro.rol_id,
    rol_nombre: primerRegistro.rol_nombre || undefined,
    cargo: primerRegistro.cargo || undefined,
    activo: Boolean(primerRegistro.activo),
    password_hash: primerRegistro.password_hash,
    permisos: permisosUnicos,
  };
}

/**
 * Servicio para obtener la información de un usuario por su ID, incluyendo sus roles y permisos actualizados.
 */
export async function getUserByIdService(
  pool: ConnectionPool,
  userId: number,
): Promise<Omit<UsuarioAuth, "password_hash">> {
  const req = pool.request();
  req.input("userId", userId);

  const query = `
    SELECT 
      u.id,
      u.usuario,
      u.nombre,
      u.activo,
      u.cargo,
      r.id AS rol_id,
      r.nombre AS rol_nombre,
      p.codigo AS permiso_codigo
    FROM usuarios u
    LEFT JOIN Usuario_Roles ur ON u.id = ur.usuario_id
    LEFT JOIN Roles r ON ur.rol_id = r.id
    LEFT JOIN Rol_Permisos rp ON r.id = rp.rol_id
    LEFT JOIN Permisos p ON rp.permiso_id = p.id
    WHERE u.id = @userId;
  `;

  const resultado = await req.query(query);

  if (resultado.recordset.length === 0) {
    throw new Error("Usuario no encontrado.");
  }

  const rows = resultado.recordset;
  const primerRegistro = rows[0];

  // Validar si la cuenta está activa
  if (!primerRegistro.activo) {
    throw new Error(
      "El usuario se encuentra desactivado. Contacte al administrador.",
    );
  }

  // Extraer el listado de códigos de permisos únicos (filtrando nulos)
  const permisosUnicos = Array.from(
    new Set(
      rows
        .map((row) => row.permiso_codigo as PermissionCode)
        .filter((codigo): codigo is PermissionCode => Boolean(codigo)),
    ),
  );

  return {
    id: primerRegistro.id,
    usuario: primerRegistro.usuario,
    nombre: primerRegistro.nombre,
    rol_id: primerRegistro.rol_id,
    rol_nombre: primerRegistro.rol_nombre || undefined,
    cargo: primerRegistro.cargo || undefined,
    activo: Boolean(primerRegistro.activo),
    permisos: permisosUnicos,
  };
}
