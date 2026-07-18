"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  Divider,
  Collapse,
} from "@mui/material";
import {
  DashboardOutlined,
  ContentCutOutlined,
  PrecisionManufacturingOutlined,
  LocalShippingOutlined,
  LayersOutlined,
  Inventory2Outlined,
  ExpandLess,
  ExpandMore,
  AdjustOutlined,
  CalendarViewDayOutlined,
  TripOriginOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import { APP_ROUTES } from "@/config/routes";

interface SidebarProps {
  title?: string;
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  title = "",
  mobileOpen,
  onClose,
}: SidebarProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const sidebarWidth = theme.customSpacing.sidebarWidth;

  const [openInventario, setOpenInventario] = useState(
    pathname.startsWith("/tubos/inventario"),
  );

  const handleInventarioClick = () => {
    setOpenInventario(!openInventario);
  };

  const menuItems = [
    { text: "Inicio Tubos", icon: <DashboardOutlined />, path: "/tubos" },
    {
      text: "Planes de Corte",
      icon: <ContentCutOutlined />,
      path: APP_ROUTES.tubos.subRoutes.planes_corte,
    },
    {
      text: "Bobinas Cortadas",
      icon: <LayersOutlined />,
      path: APP_ROUTES.tubos.subRoutes.bobinas_cortadas,
    },
    {
      text: "Producción de Tubos",
      icon: <PrecisionManufacturingOutlined />,
      path: APP_ROUTES.tubos.subRoutes.produccion,
    },
    {
      text: "Salida de Paquetes",
      icon: <LocalShippingOutlined />,
      path: APP_ROUTES.tubos.subRoutes.salida_paquetes,
    },
  ];

  const inventarioItems = [
    {
      text: "Bobinas",
      icon: <AdjustOutlined />,
      path: APP_ROUTES.tubos.subRoutes.bobinas,
    },
    {
      text: "Flejes",
      icon: <CalendarViewDayOutlined />,
      path: APP_ROUTES.tubos.subRoutes.flejes,
    },
    {
      text: "Tubos",
      icon: <TripOriginOutlined />,
      path: APP_ROUTES.tubos.subRoutes.tubos,
    },
  ];

  // Renderiza directamente el botón como un div para evitar elementos li
  const renderListItemButton = (
    item: { text: string; icon: React.ReactNode; path: string },
    isSubItem = false,
  ) => {
    const isActive = pathname === item.path;

    return (
      <ListItemButton
        component="div" // <-- Forzamos a que sea un DIV en el HTML
        selected={isActive}
        onClick={() => {
          router.push(item.path);
          if (mobileOpen) onClose();
        }}
        sx={{
          borderRadius: theme.rounded.sm,
          py: isSubItem ? 0.8 : 1.2,
          pl: isSubItem ? 4 : 2,
          mb: 0.5,
          color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
          backgroundColor: isActive
            ? "rgba(255, 255, 255, 0.08)"
            : "transparent",
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.04)",
            color: "#ffffff",
            "& .MuiListItemIcon-root": { color: "#ffffff" },
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            color: "#ffffff",
            "& .MuiListItemIcon-root": { color: "#ffffff" },
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.12)",
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            color: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
            minWidth: 40,
            "& svg": { fontSize: isSubItem ? "1.1rem" : "1.25rem" },
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={
            <Typography
              variant="body2"
              sx={{ fontWeight: isActive ? 600 : 500 }}
            >
              {item.text}
            </Typography>
          }
        />
      </ListItemButton>
    );
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Cabecera */}
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography variant="labelBold" sx={{ color: "primary.onContainer" }}>
          {title}
        </Typography>
        <Typography
          variant="h2"
          sx={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700 }}
        >
          GP ACERO
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: "rgba(255, 255, 255, 0.5)",
            fontWeight: 500,
            letterSpacing: 0.5,
          }}
        >
          LÍNEA DE TUBOS
        </Typography>
      </Box>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", mx: 2 }} />

      {/* Lista de Navegación usando tag <nav> */}
      <List component="nav" sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {/* Menú Principal */}
        {menuItems.map((item) => (
          <React.Fragment key={item.text}>
            {renderListItemButton(item)}
          </React.Fragment>
        ))}

        {/* Botón de Control del Desplegable (renderizado como div) */}
        <ListItemButton
          component="div" // <-- Evita li
          onClick={handleInventarioClick}
          sx={{
            borderRadius: theme.rounded.sm,
            py: 1.2,
            mb: 0.5,
            color: pathname.startsWith("/tubos/inventario")
              ? "#ffffff"
              : "rgba(255, 255, 255, 0.7)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              color: "#ffffff",
              "& .MuiListItemIcon-root": { color: "#ffffff" },
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: pathname.startsWith("/tubos/inventario")
                ? "#ffffff"
                : "rgba(255, 255, 255, 0.5)",
              minWidth: 40,
            }}
          >
            <Inventory2Outlined />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography
                variant="body2"
                sx={{
                  fontWeight: pathname.startsWith("/tubos/inventario")
                    ? 600
                    : 500,
                }}
              >
                Inventario
              </Typography>
            }
          />
          {openInventario ? (
            <ExpandLess sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
          ) : (
            <ExpandMore sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
          )}
        </ListItemButton>

        {/* Submenú de Inventario (renderizado como div) */}
        <Collapse
          in={openInventario}
          timeout="auto"
          unmountOnExit
          component="div"
        >
          <List component="div" disablePadding sx={{ mt: 0.5 }}>
            {inventarioItems.map((subItem) => (
              <React.Fragment key={subItem.text}>
                {renderListItemButton(subItem, true)}
              </React.Fragment>
            ))}
          </List>
        </Collapse>
      </List>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", mx: 2 }} />

      {/* Ajustes en la parte inferior */}
      <List component="nav" sx={{ px: 1.5, py: 2 }}>
        <ListItemButton
          component="div" // <-- Evita li
          onClick={() => router.push("/configuracion")}
          sx={{
            borderRadius: theme.rounded.sm,
            py: 1.2,
            color: "rgba(255, 255, 255, 0.7)",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              color: "#ffffff",
            },
          }}
        >
          <ListItemIcon
            sx={{ color: "rgba(255, 255, 255, 0.5)", minWidth: 40 }}
          >
            <SettingsOutlined />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                Configuración
              </Typography>
            }
          />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: sidebarWidth }, flexShrink: { md: 0 } }}
    >
      {/* Drawer Móvil */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },

          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: sidebarWidth,
            backgroundColor: "primary.main",
            color: "#ffffff",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Drawer Permanente */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: sidebarWidth,
            backgroundColor: "primary.main",
            color: "#ffffff",
            borderRight: "none",
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
}
