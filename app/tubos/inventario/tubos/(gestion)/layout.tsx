// @/app/tubos/(gestion)/layout.tsx
"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Button,
  Stack,
  Container,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { APP_ROUTES } from "@/config/routes";

interface LayoutTitleContextType {
  title: string;
  subtitle: string;
  setTitleInfo: (title: string, subtitle: string) => void;
}

const LayoutTitleContext = createContext<LayoutTitleContextType>({
  title: "Gestión de Tubo",
  subtitle: "",
  setTitleInfo: () => {},
});

export const useLayoutTitle = () => {
  const context = useContext(LayoutTitleContext);
  if (!context) {
    throw new Error(
      "useLayoutTitle debe ser utilizado dentro de un GestionTuboLayout",
    );
  }
  return context;
};

export default function GestionTuboLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [titleInfo, setTitleInfo] = useState({
    title: "Cargando...",
    subtitle: "",
  });

  const handleSetTitleInfo = useCallback((title: string, subtitle: string) => {
    setTitleInfo({ title, subtitle });
  }, []);

  return (
    <LayoutTitleContext.Provider
      value={{
        title: titleInfo.title,
        subtitle: titleInfo.subtitle,
        setTitleInfo: handleSetTitleInfo,
      }}
    >
      <Container maxWidth="lg">
        <Stack
          spacing={2}
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", sm: "end" },
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 700, color: "text.primary" }}
            >
              {titleInfo.title}
            </Typography>
          </Box>

          <Button
            component={Link}
            href={APP_ROUTES.tubos.subRoutes.tubos}
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            sx={{
              mt: "0px !important",
              textTransform: "none",
              borderColor: "divider",
              bgcolor: "background.paper",
              "&:hover": { bgcolor: "grey.50" },
            }}
          >
            Volver al listado
          </Button>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Zona donde se inyectan las páginas */}
        <Box component="main">{children}</Box>
      </Container>
    </LayoutTitleContext.Provider>
  );
}
