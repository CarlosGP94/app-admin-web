export interface RouteItem {
  path: string;
  label: string;
}

export const APP_ROUTES = {
  // Rutas generales del sistema
  home: "/",
  mantenimiento: "/mantenimiento",

  // Módulo completo para la Línea de Tubos
  tubos: {
    root: "/tubos",
    label: "Línea de Tubos",
    subRoutes: {
      dashboard: "/tubos",
      salida_paquetes: "/tubos/salida-paquetes",
      planes_corte: "/tubos/planes-corte",
      planes_corte_nuevo: "/tubos/planes-corte/nuevo",
      planes_corte_editar: (id: string) => `/tubos/planes-corte/${id}/editar`,
      produccion: "/tubos/produccion",
      bobinas_cortadas: "/tubos/bobinas-cortadas",
      bobinas: "/tubos/inventario/bobinas",
      bobinas_create: "/tubos/inventario/bobinas/nuevo",
      bobinas_edit: (id: string) => `/tubos/inventario/bobinas/${id}/editar`,
      flejes: "/tubos/inventario/flejes",
      flejes_create: "/tubos/inventario/flejes/nuevo",
      flejes_edit: (id: string) => `/tubos/inventario/flejes/${id}/editar`,
      tubos: "/tubos/inventario/tubos",
      tubos_create: "/tubos/inventario/tubos/nuevo",
      tubos_edit: (id: string) => `/tubos/inventario/tubos/${id}/editar`,
    },
  },
  api: {
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
  { path: APP_ROUTES.home, label: "Selector de Líneas" },
  { path: APP_ROUTES.mantenimiento, label: "Estado del Servidor" },
];
