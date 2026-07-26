// @/app/tubos/(gestion)/nuevo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert } from "@mui/material";
import BobinaForm from "@/components/tubos/bobinas/BobinaForm";
import { BobinaFormValues } from "@/components/tubos/bobinas/BobinaFormSchema";

export default function NuevaBobinaPage() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  // Estado opcional para notificar errores de la API al usuario
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitleInfo(
      "Crear nueva bobina",
      "Introduce las dimensiones y especificaciones de la nueva bobina.",
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: BobinaFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(APP_ROUTES.api.tubos.bobinas, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al crear el tubo en el servidor.",
        );
      }

      router.push(APP_ROUTES.tubos.subRoutes.bobinas.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el tubo:", error);
      setErrorMessage("Ocurrió un fallo inesperado al guardar.");
    }
  };

  return (
    <Box>
      {/* Alerta visible en caso de fallar la petición HTTP */}
      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      <BobinaForm isEditing={false} onSubmit={handleSubmit} />
    </Box>
  );
}
