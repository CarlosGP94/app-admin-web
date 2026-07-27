export type PermissionCode =
  | "tubos:dashboard:ver"
  | "tubos:salida-paquetes:ver"
  | "tubos:planes-corte:ver"
  | "tubos:planes-corte:nuevo"
  | "tubos:planes-corte:editar"
  | "tubos:planes-corte:bobinas"
  | "tubos:produccion:ver"
  | "tubos:bobinas-cortadas:ver"
  | "tubos:bobinas:ver"
  | "tubos:bobinas:nuevo"
  | "tubos:bobinas:editar"
  | "tubos:flejes:ver"
  | "tubos:flejes:nuevo"
  | "tubos:flejes:editar"
  | "tubos:tubos:ver"
  | "tubos:tubos:nuevo"
  | "tubos:tubos:editar";

export interface User {
  id: number;
  username: string;
  nombre: string;
  cargo: string;
  permisos: PermissionCode[];
}
