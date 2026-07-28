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
  FactCheckOutlined,
  ConfirmationNumberOutlined,
} from "@mui/icons-material";
import { APP_ROUTES } from "@/config/routes";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/services/auth.service";
import { PermissionCode } from "@/types/auth";

interface SidebarProps {
  title?: string;
  mobileOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  paths: string[];
  permission?: PermissionCode;
}

const isRouteActive = (currentPath: string, targetPattern: string): boolean => {
  if (currentPath === targetPattern) return true;

  const placeholder = "___DYNAMIC_PARAM___";
  const cleanedPattern = targetPattern
    .replace(/:[a-zA-Z0-9_]+/g, placeholder)
    .replace(/\[.*?\]/g, placeholder);

  const escapedPattern = cleanedPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const finalRegexStr = escapedPattern.replace(
    new RegExp(placeholder, "g"),
    "[^/]+",
  );

  try {
    const regex = new RegExp(`^${finalRegexStr}$`);
    return regex.test(currentPath);
  } catch (error) {
    console.error("Error al evaluar expresión regular de ruta:", error);
    return false;
  }
};

export default function Sidebar({
  title = "",
  mobileOpen,
  onClose,
}: SidebarProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const sidebarWidth = theme.customSpacing.sidebarWidth;

  const [openInventario, setOpenInventario] = useState(
    pathname.startsWith("/tubos/inventario"),
  );
  const [openAuditoria, setOpenAuditoria] = useState(
    pathname.startsWith("/tubos/auditoria"),
  );

  const handleInventarioClick = () => {
    setOpenInventario(!openInventario);
  };

  const handleAuditoriaClick = () => {
    setOpenAuditoria(!openAuditoria);
  };

  // 1. Definimos los elementos asignándoles su permiso correspondiente desde APP_ROUTES
  const rawMenuItems: MenuItem[] = [
    {
      text: "Inicio Tubos",
      icon: <DashboardOutlined />,
      path: "/tubos",
      paths: ["/tubos"],
    },
    {
      text: "Planes de Corte",
      icon: <ContentCutOutlined />,
      path: APP_ROUTES.tubos.subRoutes.planes_corte.path,
      paths: [
        APP_ROUTES.tubos.subRoutes.planes_corte.path,
        APP_ROUTES.tubos.subRoutes.planes_corte_nuevo.path,
        APP_ROUTES.tubos.subRoutes.planes_corte_editar.path(":id"),
        APP_ROUTES.tubos.subRoutes.planes_corte_bobinas.path(":id"),
      ],
      permission: APP_ROUTES.tubos.subRoutes.planes_corte
        .permission as PermissionCode,
    },
    {
      text: "Bobinas Cortadas",
      icon: <LayersOutlined />,
      path: APP_ROUTES.tubos.subRoutes.bobinas_cortadas.path,
      paths: [APP_ROUTES.tubos.subRoutes.bobinas_cortadas.path],
      permission: APP_ROUTES.tubos.subRoutes.bobinas_cortadas
        .permission as PermissionCode,
    },
    {
      text: "Producción de Tubos",
      icon: <PrecisionManufacturingOutlined />,
      path: APP_ROUTES.tubos.subRoutes.produccion.path,
      paths: [APP_ROUTES.tubos.subRoutes.produccion.path],
      permission: APP_ROUTES.tubos.subRoutes.produccion
        .permission as PermissionCode,
    },
    {
      text: "Salida de Paquetes",
      icon: <LocalShippingOutlined />,
      path: APP_ROUTES.tubos.subRoutes.salida_paquetes.path,
      paths: [APP_ROUTES.tubos.subRoutes.salida_paquetes.path],
      permission: APP_ROUTES.tubos.subRoutes.salida_paquetes
        .permission as PermissionCode,
    },
  ];

  const rawInventarioItems: MenuItem[] = [
    {
      text: "Bobinas",
      icon: <AdjustOutlined />,
      path: APP_ROUTES.tubos.subRoutes.bobinas.path,
      paths: [
        APP_ROUTES.tubos.subRoutes.bobinas.path,
        APP_ROUTES.tubos.subRoutes.bobinas_create.path,
        APP_ROUTES.tubos.subRoutes.bobinas_edit.path(":id"),
      ],
      permission: APP_ROUTES.tubos.subRoutes.bobinas
        .permission as PermissionCode,
    },
    {
      text: "Flejes",
      icon: <CalendarViewDayOutlined />,
      path: APP_ROUTES.tubos.subRoutes.flejes.path,
      paths: [
        APP_ROUTES.tubos.subRoutes.flejes.path,
        APP_ROUTES.tubos.subRoutes.flejes_create.path,
        APP_ROUTES.tubos.subRoutes.flejes_edit.path(":id"),
      ],
      permission: APP_ROUTES.tubos.subRoutes.flejes
        .permission as PermissionCode,
    },
    {
      text: "Tubos",
      icon: <TripOriginOutlined />,
      path: APP_ROUTES.tubos.subRoutes.tubos.path,
      paths: [
        APP_ROUTES.tubos.subRoutes.tubos.path,
        APP_ROUTES.tubos.subRoutes.tubos_create.path,
        APP_ROUTES.tubos.subRoutes.tubos_edit.path(":id"),
      ],
      permission: APP_ROUTES.tubos.subRoutes.tubos.permission as PermissionCode,
    },
  ];

  const auditoriaItems: MenuItem[] = [
    {
      text: "Lotes de Tubos",
      icon: <ConfirmationNumberOutlined />,
      path: APP_ROUTES.tubos.subRoutes.lotes_tubos.path,
      paths: [APP_ROUTES.tubos.subRoutes.lotes_tubos.path],
      permission: APP_ROUTES.tubos.subRoutes.tubos.permission as PermissionCode,
    },
  ];

  // 2. Función helper para saber si el usuario posee permiso sobre un ítem
  const canAccess = (item: MenuItem) => {
    if (!item.permission) return true;
    return hasPermission(user, item.permission);
  };

  // 3. Filtrar ítems principales e inventario según los permisos del usuario
  const menuItems = rawMenuItems.filter(canAccess);
  const inventarioItems = rawInventarioItems.filter(canAccess);

  const renderListItemButton = (item: MenuItem, isSubItem = false) => {
    const isActive = item.paths.some((p) => isRouteActive(pathname, p));

    return (
      <ListItemButton
        key={item.text}
        component="div"
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

      {/* Lista de Navegación */}
      <List component="nav" sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {/* Menú Principal (Solo los permitidos) */}
        {menuItems.map((item) => renderListItemButton(item))}

        {/* Muestra el grupo 'Inventario' únicamente si tiene permiso en al menos una subruta */}
        {inventarioItems.length > 0 && (
          <>
            <ListItemButton
              component="div"
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

            {/* Submenú de Inventario (Solo subrutas permitidas) */}
            <Collapse
              in={openInventario}
              timeout="auto"
              unmountOnExit
              component="div"
            >
              <List component="div" disablePadding sx={{ mt: 0.5 }}>
                {inventarioItems.map((subItem) =>
                  renderListItemButton(subItem, true),
                )}
              </List>
            </Collapse>
          </>
        )}

        {auditoriaItems.length > 0 && (
          <>
            <ListItemButton
              component="div"
              onClick={handleAuditoriaClick}
              sx={{
                borderRadius: theme.rounded.sm,
                py: 1.2,
                mb: 0.5,
                color: pathname.startsWith("/tubos/auditoria")
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
                  color: pathname.startsWith("/tubos/auditoria")
                    ? "#ffffff"
                    : "rgba(255, 255, 255, 0.5)",
                  minWidth: 40,
                }}
              >
                <FactCheckOutlined />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: pathname.startsWith("/tubos/auditoria")
                        ? 600
                        : 500,
                    }}
                  >
                    Auditoría
                  </Typography>
                }
              />
              {openAuditoria ? (
                <ExpandLess sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
              ) : (
                <ExpandMore sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
              )}
            </ListItemButton>

            {/* Submenú de Auditoría (Solo subrutas permitidas) */}
            <Collapse
              in={openAuditoria}
              timeout="auto"
              unmountOnExit
              component="div"
            >
              <List component="div" disablePadding sx={{ mt: 0.5 }}>
                {auditoriaItems.map((subItem) =>
                  renderListItemButton(subItem, true),
                )}
              </List>
            </Collapse>
          </>
        )}
      </List>

      <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.12)", mx: 2 }} />

      {/* Ajustes en la parte inferior */}
      <List component="nav" sx={{ px: 1.5, py: 2 }}>
        <ListItemButton
          component="div"
          onClick={() => router.push(APP_ROUTES.mantenimiento.path)}
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
