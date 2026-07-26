"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import HomeIcon from "@mui/icons-material/Home";
import LogoutIcon from "@mui/icons-material/Logout";
import { APP_ROUTES } from "@/config/routes";
import { useAuth } from "@/context/AuthContext";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleGoHome = () => {
    router.push(APP_ROUTES.home.path);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: 3,
            width: "100%",
          }}
        >
          {/* Ícono de Candado */}
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              backgroundColor: "error.light",
              color: "error.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 40 }} />
          </Box>

          <Typography
            sx={{
              fontWeight: "bold",
            }}
            variant="h4"
            component="h1"
          >
            Acceso Denegado (403)
          </Typography>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            No tienes los permisos requeridos para acceder a esta sección de la
            planta.
          </Typography>

          {/* Información contextual del usuario logueado */}
          {user && (
            <Box
              sx={{
                p: 2,
                mb: 3,
                bgcolor: "action.hover",
                borderRadius: 2,
                fontSize: "0.875rem",
                color: "text.primary",
              }}
            >
              <Typography
                variant="caption"
                sx={{ display: "block", color: "text.secondary" }}
              >
                Usuario activo
              </Typography>
              <strong>{user.nombre}</strong> — <i>{user.cargo}</i>
            </Box>
          )}

          {/* Botones de Acción */}
          <Stack
            sx={{
              direction: { xs: "column", sm: "row" },
              gap: 2,
              justifyContent: "center",
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
              fullWidth
            >
              Volver al Inicio
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              fullWidth
            >
              Cerrar Sesión
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
}
