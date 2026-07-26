export interface RouteItem {
  path: string;
  label: string;
}

export const APP_ROUTES = {
  // Rutas generales del sistema
  home: {
    path: "/",
    label: "Selector de Líneas",
  },
  mantenimiento: {
    path: "/mantenimiento",
    label: "Mantenimiento del Sistema",
  },
  login: {
    path: "/login",
    label: "Iniciar Sesión",
  },
  "403": {
    path: "/403",
    label: "Sin Autorización",
  },
  // Módulo completo para la Línea de Tubos
  tubos: {
    path: "/tubos",
    label: "Línea de Producción de Tubos",
    subRoutes: {
      dashboard: {
        path: "/tubos/dashboard",
        permission: "tubos:dashboard:ver",
      },
      salida_paquetes: {
        path: "/tubos/salida-paquetes",
        permission: "tubos:salida-paquetes:ver",
        label: "Salida de Paquetes",
      },
      planes_corte: {
        path: "/tubos/planes-corte",
        permission: "tubos:planes-corte:ver",
        label: "Planes de Corte",
      },
      planes_corte_nuevo: {
        path: "/tubos/planes-corte/nuevo",
        permission: "tubos:planes-corte:nuevo",
        label: "Plan de Corte / Nuevo",
      },
      planes_corte_editar: {
        path: (id: string) => `/tubos/planes-corte/${id}/editar`,
        permission: "tubos:planes-corte:editar",
        label: "Plan de Corte / Editar",
      },
      planes_corte_bobinas: {
        path: (id: string) => `/tubos/planes-corte/${id}/bobinas`,
        permission: "tubos:planes-corte:bobinas",
        label: "Plan de Corte / Bobinas",
      },
      produccion: {
        path: "/tubos/produccion",
        permission: "tubos:produccion:ver",
        label: "Producción",
      },
      bobinas_cortadas: {
        path: "/tubos/bobinas-cortadas",
        permission: "tubos:bobinas-cortadas:ver",
        label: "Bobinas Cortadas",
      },
      bobinas: {
        path: "/tubos/inventario/bobinas",
        permission: "tubos:bobinas:ver",
        label: "Inventario de Bobinas",
      },
      bobinas_create: {
        path: "/tubos/inventario/bobinas/nuevo",
        permission: "tubos:bobinas:nuevo",
        label: "Inventario de Bobina / Nuevo",
      },
      bobinas_edit: {
        path: (id: string) => `/tubos/inventario/bobinas/${id}/editar`,
        permission: "tubos:bobinas:editar",
        label: "Inventario de Bobina / Editar",
      },
      flejes: {
        path: "/tubos/inventario/flejes",
        permission: "tubos:flejes:ver",
        label: "Inventario de Flejes",
      },
      flejes_create: {
        path: "/tubos/inventario/flejes/nuevo",
        permission: "tubos:flejes:nuevo",
        label: "Inventario de Fleje / Nuevo",
      },
      flejes_edit: {
        path: (id: string) => `/tubos/inventario/flejes/${id}/editar`,
        permission: "tubos:flejes:editar",
        label: "Inventario de Fleje / Editar",
      },
      tubos: {
        path: "/tubos/inventario/tubos",
        permission: "tubos:tubos:ver",
        label: "Inventario de Tubos",
      },
      tubos_create: {
        path: "/tubos/inventario/tubos/nuevo",
        permission: "tubos:tubos:nuevo",
        label: "Inventario de Tubo / Nuevo",
      },
      tubos_edit: {
        path: (id: string) => `/tubos/inventario/tubos/${id}/editar`,
        permission: "tubos:tubos:editar",
        label: "Inventario de Tubo / Editar",
      },
    },
  },
  api: {
    auth: {
      login: "/api/auth/login",
    },
    tubos: {
      maquinas: "/api/tubos/maquinas",
      tipos: "/api/tubos/tipos",
      calidades: "/api/tubos/calidades",
      fabricantes: "/api/tubos/fabricantes",
      tubos: "/api/tubos/tubos",
      tubos_filtros: "/api/tubos/tubos/filtros",
      tubos_detalle: (id: string) => `/api/tubos/tubos/${id}`,
      tubos_informe: "/api/tubos/tubos/informe",
      flejes: "/api/tubos/flejes",
      flejes_filtros: "/api/tubos/flejes/filtros",
      flejes_detalle: (id: string) => `/api/tubos/flejes/${id}`,
      flejes_informe: "/api/tubos/flejes/informe",
      flejes_all: "/api/tubos/flejes/all",
      bobinas: "/api/tubos/bobinas",
      bobinas_detalle: (id: string) => `/api/tubos/bobinas/${id}`,
      bobinas_filtros: "/api/tubos/bobinas/filtros",
      bobinas_informe: "/api/tubos/bobinas/informe",
      salida_paquetes: "/api/tubos/salida-paquetes",
      salida_paquetes_filtros: "/api/tubos/salida-paquetes/filtros",
      produccion: "/api/tubos/produccion",
      produccion_filtros: "/api/tubos/produccion/filtros",
      bobinas_cortadas: "/api/tubos/bobinas_cortadas",
      bobinas_cortadas_filtros: "/api/tubos/bobinas_cortadas/filtros",
      planes_corte: "/api/tubos/planes_corte",
      planes_corte_filtros: "/api/tubos/planes_corte/filtros",
      planes_corte_detalle: (id: string) => `/api/tubos/planes_corte/${id}`,
    },
  },
};

// Rutas globales auxiliares (por si necesitas iterar barras de herramientas)
export const globalAuxRoutes: RouteItem[] = [
  { path: APP_ROUTES.home.path, label: "Selector de Líneas" },
  { path: APP_ROUTES.mantenimiento.path, label: "Estado del Servidor" },
];
