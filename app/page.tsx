"use client";

import React from "react";
import { APP_ROUTES } from "@/config/routes";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardActionArea,
  useTheme,
} from "@mui/material";
import {
  BlurCircularOutlined, // Icono representativo para Tubos
  GridOnOutlined, // Icono representativo para Mallas
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

export default function SelectorLineaPage() {
  const theme = useTheme();
  const router = useRouter();

  // Configuración de las dos líneas de producción
  const lineas = [
    {
      titulo: "Línea de Tubos",
      descripcion:
        "Monitoreo de conformado de perfiles, extrusión, bobinas de acero y control de dimensiones en tiempo real.",
      icono: <BlurCircularOutlined sx={{ fontSize: "4.5rem" }} />,
      ruta: APP_ROUTES.tubos.root,
    },
    {
      titulo: "Línea de Mallas",
      descripcion:
        "Supervisión de electrosoldado, control de mallas standard y especiales, y estado de la maquinaria activa.",
      icono: <GridOnOutlined sx={{ fontSize: "4.5rem" }} />,
      ruta: APP_ROUTES.mantenimiento,
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        // Ocupa el alto disponible restando el padding del contenedor del layout
        minHeight: {
          xs: "calc(100vh - 120px)",
          md: "calc(100vh - 160px)",
        },
        py: 4,
      }}
    >
      {/* Cabecera Principal */}
      <Box sx={{ textAlign: "center", mb: 6, maxWidth: "600px" }}>
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "2rem", md: "2.5rem" },
            fontWeight: 800,
            color: "primary.main",
            mb: 2,
          }}
        >
          Áreas de Producción
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Seleccione la línea de producción que desea visualizar o administrar
          para comenzar a trabajar.
        </Typography>
      </Box>

      {/* Grid Contenedor de las dos Cards */}
      <Grid container spacing={4} sx={{ maxWidth: "900px", width: "100%" }}>
        {lineas.map((linea) => (
          /* Aplicando la nueva propiedad unificada size conforme a MUI v6 */
          <Grid size={{ xs: 12, sm: 6 }} key={linea.titulo}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                borderRadius: theme.rounded?.md || "12px",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "none",
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: "0 12px 24px rgba(0, 16, 64, 0.08)",
                  borderColor: "primary.main",
                  "& .icon-container": {
                    backgroundColor: "primary.main",
                    color: "#ffffff",
                  },
                },
              }}
            >
              <CardActionArea
                onClick={() => router.push(linea.ruta)}
                sx={{
                  flexGrow: 1,
                  p: { xs: 4, md: 5 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                {/* Contenedor circular para el Icono */}
                <Box
                  className="icon-container"
                  sx={{
                    width: 110,
                    height: 110,
                    borderRadius: "50%",
                    backgroundColor: "primary.container",
                    color: "primary.onContainer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 3,
                    transition: "all 0.25s ease-in-out",
                  }}
                >
                  {linea.icono}
                </Box>

                <Typography
                  variant="h2"
                  sx={{
                    fontSize: "1.5rem",
                    fontWeight: 700,
                    color: "text.primary",
                    mb: 2,
                  }}
                >
                  {linea.titulo}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    lineHeight: 1.6,
                    maxWidth: "300px",
                  }}
                >
                  {linea.descripcion}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
