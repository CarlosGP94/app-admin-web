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
      produccion_create: {
        path: "/tubos/produccion/nuevo",
        permission: "tubos:produccion:nuevo",
        label: "Producción / Nueva",
      },
      produccion_edit: {
        path: (id: string) => `/tubos/produccion/${id}/editar`,
        permission: "tubos:produccion:editar",
        label: "Producción / Editar",
      },
      produccion_control_dimensional: {
        path: (id: string) => `/tubos/produccion/${id}/control-dimensional`,
        permission: "tubos:produccion:control-dimensional",
        label: "Producción / Control Dimensional",
      },
      produccion_coladas: {
        path: "/tubos/produccion/coladas",
        permission: "tubos:produccion:coladas",
        label: "Producción / Coladas",
      },
      lotes_tubos: {
        path: "/tubos/auditoria/lotes-tubos",
        permission: "tubos:lotes-tubos:ver",
        label: "Auditoría / Lotes de Tubos",
      },
      lotes_tubos_coladas: {
        path: "/tubos/auditoria/lotes-tubos/coladas",
        permission: "tubos:lotes-tubos:coladas",
        label: "Auditoría / Lotes de Tubos / Coladas",
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
      me: "/api/auth/me",
    },
    tubos: {
      maquinas: "/api/tubos/maquinas",
      tipos: "/api/tubos/tipos",
      calidades: "/api/tubos/calidades",
      fabricantes: "/api/tubos/fabricantes",
      turnos: "/api/tubos/turnos",
      operarios: "/api/tubos/operarios",
      tubos: "/api/tubos/tubos",
      tubos_filtros: "/api/tubos/tubos/filtros",
      tubos_detalle: (id: string) => `/api/tubos/tubos/${id}`,
      tubos_informe: "/api/tubos/tubos/informe",
      tubos_all: "/api/tubos/tubos/all",
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
      produccion_detalle: (id: string) => `/api/tubos/produccion/${id}`,
      produccion_filtros: "/api/tubos/produccion/filtros",
      produccion_control_dimensional: (id: string) =>
        `/api/tubos/produccion/${id}/control-dimensional`,
      produccion_lotes_flejes: "/api/tubos/produccion/lotes_flejes",
      lotes_tubos: "/api/tubos/lotes_tubos",
      lotes_tubos_all: "/api/tubos/lotes_tubos/all",
      lotes_tubos_filtros: "/api/tubos/lotes_tubos/filtros",
      lotes_tubos_flejes: "/api/tubos/lotes_tubos/lotes_flejes",
      control_dimensional: "/api/tubos/control_dimensional",
      bobinas_cortadas: "/api/tubos/bobinas_cortadas",
      bobinas_cortadas_filtros: "/api/tubos/bobinas_cortadas/filtros",
      bobinas_coladas_bobina: (id: string) =>
        "/api/tubos/bobinas_coladas/bobina/" + id,
      planes_corte: "/api/tubos/planes_corte",
      planes_corte_filtros: "/api/tubos/planes_corte/filtros",
      planes_corte_detalle: (id: string) => `/api/tubos/planes_corte/${id}`,

      // Auditoría
      auditoria: "/api/tubos/auditoria",
    },
  },
};

// Rutas globales auxiliares (por si necesitas iterar barras de herramientas)
export const globalAuxRoutes: RouteItem[] = [
  { path: APP_ROUTES.home.path, label: "Selector de Líneas" },
  { path: APP_ROUTES.mantenimiento.path, label: "Estado del Servidor" },
];
