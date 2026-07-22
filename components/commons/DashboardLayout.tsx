"use client";

import React, { useState } from "react";
import { Box, useTheme } from "@mui/material";
import { usePathname } from "next/navigation"; // 🔥 Importamos el hook para leer la ruta actual
import Sidebar from "./Sidebar";
import Header from "./Header";
import { APP_ROUTES } from "@/config/routes";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// 🗺️ Diccionario de títulos mapeados por sus rutas
const ROUTE_TITLES: Record<string, string> = {
  [APP_ROUTES.tubos.subRoutes.planes_corte]: "Planes de Corte",
  [APP_ROUTES.tubos.subRoutes.bobinas_cortadas]: "Bobinas Cortadas",
  [APP_ROUTES.tubos.subRoutes.produccion]: "Producción de Tubos",
  [APP_ROUTES.tubos.subRoutes.salida_paquetes]: "Salidas de Paquetes",
  [APP_ROUTES.tubos.subRoutes.tubos]: "Inventario de Tubos",
  [APP_ROUTES.tubos.subRoutes.tubos_create]: "Inventario de Tubos - Nuevo",
  [APP_ROUTES.tubos.subRoutes.tubos_edit(":id")]:
    "Inventario de Tubos - Editar",
  [APP_ROUTES.tubos.subRoutes.flejes]: "Inventario de Flejes",
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const pathname = usePathname(); // 📍 Obtiene la ruta actual, ej: "/dashboard/plan-corte"

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // 🏷️ Función para resolver el título de forma limpia o dinámica
  const getPageTitle = (): string => {
    // 1. Intenta buscar la coincidencia exacta en el diccionario
    if (ROUTE_TITLES[pathname]) {
      return ROUTE_TITLES[pathname];
    }

    // 2. Fallback dinámico: si la ruta no existe en el mapa (ej: "/dashboard/mallas/crear"),
    // limpia el último segmento de la URL sustituyendo guiones por espacios y capitalizando.
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
        <Header
          title={getPageTitle()} // 🔥 Inyectamos el título resuelto dinámicamente
          onDrawerToggle={handleDrawerToggle}
        />

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
