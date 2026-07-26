"use client";

import React, { useState } from "react";
import { Box, useTheme } from "@mui/material";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { APP_ROUTES } from "@/config/routes";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// 🗺️ Diccionario de títulos mapeados por sus rutas
const ROUTE_TITLES: Record<string, string> = {
  [APP_ROUTES.tubos.subRoutes.planes_corte]: "Planes de Corte",
  [APP_ROUTES.tubos.subRoutes.planes_corte_nuevo]: "Planes de Corte - Nuevo",
  [APP_ROUTES.tubos.subRoutes.planes_corte_editar(":id")]:
    "Planes de Corte - Editar",
  [APP_ROUTES.tubos.subRoutes.planes_corte_bobinas(":id")]:
    "Planes de Corte - Bobinas",
  [APP_ROUTES.tubos.subRoutes.bobinas_cortadas]: "Bobinas Cortadas",
  [APP_ROUTES.tubos.subRoutes.produccion]: "Producción de Tubos",
  [APP_ROUTES.tubos.subRoutes.salida_paquetes]: "Salidas de Paquetes",
  [APP_ROUTES.tubos.subRoutes.tubos]: "Inventario de Tubos",
  [APP_ROUTES.tubos.subRoutes.tubos_create]: "Inventario de Tubos - Nuevo",
  [APP_ROUTES.tubos.subRoutes.tubos_edit(":id")]:
    "Inventario de Tubos - Editar",
  [APP_ROUTES.tubos.subRoutes.flejes]: "Inventario de Flejes",
  [APP_ROUTES.tubos.subRoutes.flejes_create]: "Inventario de Flejes - Nuevo",
  [APP_ROUTES.tubos.subRoutes.flejes_edit(":id")]:
    "Inventario de Flejes - Editar",
  [APP_ROUTES.tubos.subRoutes.bobinas]: "Inventario de Bobinas",
  [APP_ROUTES.tubos.subRoutes.bobinas_create]: "Inventario de Bobinas - Nuevo",
  [APP_ROUTES.tubos.subRoutes.bobinas_edit(":id")]:
    "Inventario de Bobinas - Editar",
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 🏷️ Función para resolver el título de forma limpia y dinámica
  const getPageTitle = (): string => {
    // 1. Coincidencia exacta
    if (ROUTE_TITLES[pathname]) {
      return ROUTE_TITLES[pathname];
    }

    // 2. Coincidencia por patrón dinámico (remplaza `:id` u otros slugs por regex)
    for (const [routePattern, title] of Object.entries(ROUTE_TITLES)) {
      if (routePattern.includes(":")) {
        // Convierte p.ej. '/tubos/planes-corte/:id/bobinas' en un Regex -> /^\/tubos\/planes-corte\/[^\/]+\/bobinas$/
        const regexPattern = new RegExp(
          "^" + routePattern.replace(/:[a-zA-Z0-9_]+/g, "[^/]+") + "$",
        );

        if (regexPattern.test(pathname)) {
          return title;
        }
      }
    }

    // 3. Fallback dinámico genérico
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";

    if (!lastSegment || lastSegment === "dashboard") return "Inicio";

    return lastSegment
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const gutter = theme.customSpacing?.gutter || 16;
  const containerMargin = theme.customSpacing?.containerMargin || 24;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* 1. Menú de navegación lateral */}
      <Sidebar
        title="Producción de Tubos"
        mobileOpen={mobileOpen}
        onClose={handleDrawerToggle}
      />

      {/* 2. Área del contenido principal (Header + Página actual) */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        {/* Barra superior */}
        <Header title={getPageTitle()} onDrawerToggle={handleDrawerToggle} />

        {/* Contenido dinámico de las páginas */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: {
              xs: `${gutter}px`,
              md: `${containerMargin}px`,
            },
            backgroundColor: "background.default",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
