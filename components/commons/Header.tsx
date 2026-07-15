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
} from "@mui/material";
import { MenuOutlined, AccountCircleOutlined } from "@mui/icons-material";

interface HeaderProps {
  title?: string;
  onDrawerToggle: () => void;
}

export default function Header({ title = "", onDrawerToggle }: HeaderProps) {
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: "background.paper",
        color: "text.primary",
        borderBottom: `1px solid ${theme.palette.divider}`,
        zIndex: theme.zIndex.drawer + 1, // Garantiza que se superponga correctamente al hacer scroll
        boxShadow: "none",
      }}
    >
      <Toolbar sx={{ justifyContent: "space-between", px: { xs: 2, md: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {/* Botón de menú hamburguesa (visible solo en móviles y tablets) */}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Marcelo Llanes
            </Typography>
            <Typography
              variant="labelBold"
              sx={{ fontSize: "0.65rem", color: "text.secondary" }}
            >
              Ing. Automatización
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: "primary.container", width: 36, height: 36 }}>
            <AccountCircleOutlined sx={{ color: "primary.onContainer" }} />
          </Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
