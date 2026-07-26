"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress, Typography, Paper } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/services/auth.service";
import { PermissionCode } from "@/types/auth";
import { APP_ROUTES } from "@/config/routes";

interface ProtectedRouteProps {
  requiredPermission?: PermissionCode;
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  children,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const userHasPermission = hasPermission(user, requiredPermission);

  useEffect(() => {
    if (isLoading) return;

    // 1. Si no está autenticado, redirigir al login reemplazando la ruta actual en el historial
    if (!isAuthenticated || !user) {
      router.replace(APP_ROUTES.login.path);
      return;
    }

    // 2. Si no tiene permiso para esta ruta, redirigir a 403
    if (requiredPermission && !userHasPermission) {
      router.replace("/403");
    }
  }, [
    user,
    isAuthenticated,
    isLoading,
    requiredPermission,
    userHasPermission,
    router,
  ]);

  // Mientras se valida el estado o se efectúa la redirección, mostramos un indicador visual refinado
  if (
    isLoading ||
    !isAuthenticated ||
    (requiredPermission && !userHasPermission)
  ) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "80vh",
          width: "100%",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "transparent",
          }}
        >
          <Box sx={{ position: "relative", display: "inline-flex", mb: 2 }}>
            <CircularProgress size={56} thickness={4} />
            <Box
              sx={{
                top: 0,
                left: 0,
                bottom: 0,
                right: 0,
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <LockOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
            </Box>
          </Box>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", fontWeight: 500 }}
          >
            Validando sesión y permisos...
          </Typography>
        </Paper>
      </Box>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
