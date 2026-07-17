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
      produccion: "/tubos/produccion",
      bobinas_cortadas: "/tubos/bobinas-cortadas",
      bobinas: "/tubos/inventario/bobinas",
      flejes: "/tubos/inventario/flejes",
      tubos: "/tubos/inventario/tubos",
    },
  },
  api: {
    tubos: {
      planes_corte: "/api/tubos/planes_corte",
      planes_corte_anchos: "/api/tubos/planes_corte/anchos",
    },
  },
};

// Rutas globales auxiliares (por si necesitas iterar barras de herramientas)
export const globalAuxRoutes: RouteItem[] = [
  { path: APP_ROUTES.home, label: "Selector de Líneas" },
  { path: APP_ROUTES.mantenimiento, label: "Estado del Servidor" },
];
