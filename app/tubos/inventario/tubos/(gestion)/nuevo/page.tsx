// @/app/tubos/(gestion)/nuevo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import TuboForm from "@/components/tubos/tubos/TubosForm";
import { TuboFormValues } from "@/components/tubos/tubos/TuboFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert, Snackbar } from "@mui/material";

export default function NuevoTuboPage() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  // Estado opcional para notificar errores de la API al usuario
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitleInfo(
      "Crear nuevo tubo",
      "Introduce las dimensiones y especificaciones del nuevo lote de producción.",
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: TuboFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(APP_ROUTES.api.tubos.tubos, {
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

      router.push(APP_ROUTES.tubos.subRoutes.tubos);
      router.refresh(); // Opcional: fuerza la revalidación de datos en la vista del listado
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

      <TuboForm isEditing={false} onSubmit={handleSubmit} />
    </Box>
  );
}
