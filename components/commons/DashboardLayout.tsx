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
  [APP_ROUTES.tubos.subRoutes.planes_corte.path]:
    APP_ROUTES.tubos.subRoutes.planes_corte.label,
  [APP_ROUTES.tubos.subRoutes.planes_corte_nuevo.path]:
    APP_ROUTES.tubos.subRoutes.planes_corte_nuevo.label,
  [APP_ROUTES.tubos.subRoutes.planes_corte_editar.path(":id")]:
    APP_ROUTES.tubos.subRoutes.planes_corte_editar.label,
  [APP_ROUTES.tubos.subRoutes.planes_corte_bobinas.path(":id")]:
    APP_ROUTES.tubos.subRoutes.planes_corte_bobinas.label,
  [APP_ROUTES.tubos.subRoutes.bobinas_cortadas.path]:
    APP_ROUTES.tubos.subRoutes.bobinas_cortadas.label,
  [APP_ROUTES.tubos.subRoutes.produccion.path]:
    APP_ROUTES.tubos.subRoutes.produccion.label,
  [APP_ROUTES.tubos.subRoutes.salida_paquetes.path]:
    APP_ROUTES.tubos.subRoutes.salida_paquetes.label,
  [APP_ROUTES.tubos.subRoutes.tubos.path]:
    APP_ROUTES.tubos.subRoutes.tubos.label,
  [APP_ROUTES.tubos.subRoutes.tubos_create.path]:
    APP_ROUTES.tubos.subRoutes.tubos_create.label,
  [APP_ROUTES.tubos.subRoutes.tubos_edit.path(":id")]:
    APP_ROUTES.tubos.subRoutes.tubos_edit.label,
  [APP_ROUTES.tubos.subRoutes.flejes.path]:
    APP_ROUTES.tubos.subRoutes.flejes.label,
  [APP_ROUTES.tubos.subRoutes.flejes_create.path]:
    APP_ROUTES.tubos.subRoutes.flejes_create.label,
  [APP_ROUTES.tubos.subRoutes.flejes_edit.path(":id")]:
    APP_ROUTES.tubos.subRoutes.flejes_edit.label,
  [APP_ROUTES.tubos.subRoutes.bobinas.path]:
    APP_ROUTES.tubos.subRoutes.bobinas.label,
  [APP_ROUTES.tubos.subRoutes.bobinas_create.path]:
    APP_ROUTES.tubos.subRoutes.bobinas_create.label,
  [APP_ROUTES.tubos.subRoutes.bobinas_edit.path(":id")]:
    APP_ROUTES.tubos.subRoutes.bobinas_edit.label,
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
