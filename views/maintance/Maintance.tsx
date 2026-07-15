"use client";

import React from "react";
import { Box, Typography, Button, Container, useTheme } from "@mui/material";
import { EngineeringOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";

interface MantenimientoProps {
  /**
   * Ruta a la que se redirigirá al usuario al pulsar el botón principal.
   * @default '/'
   */
  redirectUrl?: string;
  /**
   * Texto que se mostrará en el botón de acción.
   * @default 'Panel Principal'
   */
  buttonText?: string;
}

export default function Mantenimiento({
  redirectUrl = "/",
  buttonText = "Panel Principal",
}: MantenimientoProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "background.default",
        px: 3,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Detalle estético industrial: Línea superior de advertencia técnica */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "6px",
          background: `repeating-linear-gradient(
            -45deg,
            ${theme.palette.warning?.main || "#f57c00"},
            ${theme.palette.warning?.main || "#f57c00"} 10px,
            ${theme.palette.primary.main} 10px,
            ${theme.palette.primary.main} 20px
          )`,
        }}
      />

      <Container maxWidth="sm">
        {/* Contenedor del Icono animado */}
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: "50%",
            backgroundColor: "primary.container",
            color: "primary.main",
            mb: 4,
            boxShadow: "0 8px 16px rgba(0, 16, 64, 0.05)",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              border: `2px dashed ${theme.palette.primary.main}`,
              animation: "spin 20s linear infinite",
            },
            "@keyframes spin": {
              "100%": {
                transform: "rotate(360deg)",
              },
            },
          }}
        >
          {/* Corregido el color del icono para que use el token del tema */}
          <EngineeringOutlined
            sx={{ fontSize: "4.5rem", color: "primary.onContainer" }}
          />
        </Box>

        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "2rem", md: "2.5rem" },
            fontWeight: 800,
            color: "text.primary",
            mb: 2,
            textTransform: "uppercase",
          }}
        >
          Mantenimiento
        </Typography>

        {/* Acciones del Operador */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => router.push(redirectUrl)}
            sx={{
              px: 3,
              py: 1.2,
              borderRadius: theme.rounded?.sm || "4px",
              boxShadow: "none",
              "&:hover": {
                boxShadow: "none",
              },
            }}
          >
            {buttonText}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
