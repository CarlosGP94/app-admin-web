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
  Button,
  Chip,
  Avatar,
  alpha,
  Skeleton,
} from "@mui/material";
import {
  BlurCircularOutlined,
  GridOnOutlined,
  LoginOutlined,
  LogoutOutlined,
  ArrowForwardOutlined,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "react-toastify";

export default function SelectorLineaPage() {
  const theme = useTheme();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const handleLineClick = (ruta: string) => {
    if (!isAuthenticated) {
      toast.info("Inicia sesión para acceder a una línea de producción.");
      return;
    }

    router.push(ruta);
  };

  const handleLogout = () => {
    logout();
    toast.success("Sesión cerrada correctamente.");
  };

  // Configuración de las dos líneas de producción
  const lineas = [
    {
      titulo: "Línea de Tubos",
      descripcion:
        "Monitoreo de conformado de perfiles, extrusión, bobinas de acero y control de dimensiones en tiempo real.",
      icono: <BlurCircularOutlined sx={{ fontSize: "3.2rem" }} />,
      ruta: APP_ROUTES.tubos.path,
    },
    {
      titulo: "Línea de Mallas",
      descripcion:
        "Supervisión de electrosoldado, control de mallas standard y especiales, y estado de la maquinaria activa.",
      icono: <GridOnOutlined sx={{ fontSize: "3.2rem" }} />,
      ruta: APP_ROUTES.mantenimiento.path,
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: {
          xs: "calc(100vh - 120px)",
          md: "calc(100vh - 160px)",
        },
        py: 4,
        px: 2,
      }}
    >
      {/* Barra de estado de usuario superior */}
      <Box
        sx={{
          width: "100%",
          maxWidth: "900px",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          mb: 4,
          minHeight: "48px",
        }}
      >
        {isLoading ? (
          <Skeleton
            variant="rounded"
            width={220}
            height={40}
            sx={{ borderRadius: 8 }}
          />
        ) : isAuthenticated && user ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 0.75,
              pl: 2,
              borderRadius: "50px",
              bgcolor: alpha(theme.palette.background.paper, 0.8),
              border: `1px solid ${theme.palette.divider}`,
              backdropFilter: "blur(8px)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  fontSize: "0.875rem",
                  bgcolor: "primary.main",
                  fontWeight: 600,
                }}
              >
                {(user.nombre || user.username || "U")[0].toUpperCase()}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {user.nombre || user.username}
              </Typography>
            </Box>

            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<LogoutOutlined fontSize="small" />}
              onClick={handleLogout}
              sx={{
                borderRadius: "20px",
                textTransform: "none",
                fontWeight: 600,
                px: 2,
              }}
            >
              Cerrar sesión
            </Button>
          </Box>
        ) : (
          <Button
            variant="contained"
            color="primary"
            startIcon={<LoginOutlined />}
            onClick={() => router.push(APP_ROUTES.login.path)}
            sx={{
              borderRadius: "10px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
              textTransform: "none",
            }}
          >
            Iniciar sesión
          </Button>
        )}
      </Box>

      {/* Cabecera Principal */}
      <Box sx={{ textAlign: "center", mb: 6, maxWidth: "620px" }}>
        <Chip
          label="SISTEMA DE CONTROL Y MONITOREO"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ mb: 2, fontWeight: 700, letterSpacing: 1, fontSize: "0.7rem" }}
        />
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: "2.2rem", md: "2.75rem" },
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "text.primary",
            mb: 1.5,
          }}
        >
          Áreas de Producción
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ fontSize: { xs: "0.95rem", md: "1.05rem" }, lineHeight: 1.6 }}
        >
          Seleccione la línea industrial para visualizar telemetría, métricas y
          administración de procesos en tiempo real.
        </Typography>
      </Box>

      {/* Grid Contenedor de Cards */}
      <Grid container spacing={3.5} sx={{ maxWidth: "900px", width: "100%" }}>
        {lineas.map((linea) => (
          <Grid size={{ xs: 12, sm: 6 }} key={linea.titulo}>
            <Card
              sx={{
                height: "100%",
                borderRadius: "16px",
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
                background:
                  theme.palette.mode === "dark"
                    ? "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)"
                    : "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                "&:hover": {
                  transform: "translateY(-6px)",
                  borderColor: alpha(theme.palette.primary.main, 0.5),
                  boxShadow: `0 12px 28px ${alpha(theme.palette.primary.main, 0.12)}`,
                  "& .icon-container": {
                    bgcolor: "primary.main",
                    color: "#ffffff",
                    transform: "scale(1.05)",
                  },
                  "& .cta-arrow": {
                    transform: "translateX(4px)",
                    color: "primary.main",
                  },
                },
              }}
            >
              <CardActionArea
                disabled={!isAuthenticated || isLoading}
                onClick={() => handleLineClick(linea.ruta)}
                sx={{
                  height: "100%",
                  p: { xs: 4, md: 4.5 },
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  justifyContent: "space-between",
                  "&.Mui-disabled": {
                    opacity: 0.65,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  {/* Contenedor circular del Icono */}
                  <Box
                    className="icon-container"
                    sx={{
                      width: 96,
                      height: 96,
                      borderRadius: "24px", // Bordes suavizados estilo App
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: "primary.main",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 3,
                      transition: "all 0.3s ease-in-out",
                    }}
                  >
                    {linea.icono}
                  </Box>

                  <Typography
                    variant="h2"
                    sx={{
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      color: "text.primary",
                      mb: 1.5,
                    }}
                  >
                    {linea.titulo}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      lineHeight: 1.6,
                      maxWidth: "280px",
                      mb: 3,
                    }}
                  >
                    {linea.descripcion}
                  </Typography>
                </Box>

                {/* Footer contextual dentro de la tarjeta */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    mt: "auto",
                    pt: 2,
                    borderTop: `1px stroke ${alpha(theme.palette.divider, 0.5)}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    className="cta-arrow"
                    sx={{
                      fontWeight: 700,
                      color: isAuthenticated
                        ? "text.secondary"
                        : "text.disabled",
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isAuthenticated ? "Acceder a línea" : "Sesión requerida"}
                    {isAuthenticated && (
                      <ArrowForwardOutlined sx={{ fontSize: "1rem" }} />
                    )}
                  </Typography>
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
