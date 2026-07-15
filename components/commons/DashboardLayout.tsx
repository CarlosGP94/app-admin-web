"use client";

import React, { useState } from "react";
import { Box, useTheme } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
          minWidth: 0, // Previene desbordamiento en elementos flex con tablas
        }}
      >
        {/* Barra superior */}
        <Header
          title="Titulo de la pagina"
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
