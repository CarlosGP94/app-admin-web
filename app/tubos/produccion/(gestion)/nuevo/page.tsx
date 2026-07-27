// @/app/tubos/(gestion)/nuevo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import { TuboFormValues } from "@/components/tubos/tubos/TuboFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

export default function NuevoProduccionPage() {
  const permission = APP_ROUTES.tubos.subRoutes.produccion_create
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <NuevoProduccionView />
    </ProtectedRoute>
  );
}

export function NuevoProduccionView() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  // Estado opcional para notificar errores de la API al usuario
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitleInfo(
      "Crear nueva producción",
      "Ingrese los datos de la producción para crear un nuevo registro.",
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: TuboFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(APP_ROUTES.api.tubos.produccion, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al crear la producción en el servidor.",
        );
      }

      router.push(APP_ROUTES.tubos.subRoutes.produccion.path);
      router.refresh(); // Opcional: fuerza la revalidación de datos en la vista del listado
    } catch (error) {
      console.error("Error al guardar la producción:", error);
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

      {/* <TuboForm isEditing={false} onSubmit={handleSubmit} /> */}
    </Box>
  );
}
