"use client";

import React from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  useTheme,
  Skeleton,
} from "@mui/material";
import { MenuOutlined, AccountCircleOutlined } from "@mui/icons-material";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  title?: string;
  onDrawerToggle: () => void;
}

export default function Header({ title = "", onDrawerToggle }: HeaderProps) {
  const theme = useTheme();
  const { isLoading, user, isAuthenticated } = useAuth(); // Aquí asumimos que tienes un hook useAuth para obtener la sesión del usuario

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.drawer + 1,
        boxShadow: "none",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 1, display: { md: "none" } }}
          >
            <MenuOutlined />
          </IconButton>

          <Typography
            variant="h2"
            sx={{
              fontSize: "1.125rem",
              color: "primary.main",
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
        </Box>

        {/* Sección del perfil de usuario */}
        {isLoading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {/* Mimic de los textos alineados a la derecha */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <Skeleton variant="text" width={90} height={18} />
              <Skeleton
                variant="text"
                width={110}
                height={12}
                sx={{ mt: 0.5 }}
              />
            </Box>
            {/* Mimic del Avatar circular */}
            <Skeleton variant="circular" width={36} height={36} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.nombre || "Usuario"}
              </Typography>
              <Typography
                variant="labelBold"
                sx={{ fontSize: "0.65rem", color: "text.secondary" }}
              >
                {user?.cargo || "Cargo"}
              </Typography>
            </Box>
            <Avatar
              sx={{ bgcolor: "primary.container", width: 36, height: 36 }}
            >
              <AccountCircleOutlined sx={{ color: "primary.onContainer" }} />
            </Avatar>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
