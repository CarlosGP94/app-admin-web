// @/app/tubos/(gestion)/nuevo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert } from "@mui/material";
import FlejeForm from "@/components/tubos/flejes/FlejeForm";
import { FlejeFormValues } from "@/components/tubos/flejes/FlejeFormSchema";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

export default function NuevoFlejePage() {
  const permission = APP_ROUTES.tubos.subRoutes.flejes_create
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <NuevoFlejeView />
    </ProtectedRoute>
  );
}

export function NuevoFlejeView() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  // Estado opcional para notificar errores de la API al usuario
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitleInfo(
      "Crear nuevo fleje",
      "Aquí puedes registrar un nuevo fleje en el sistema.",
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: FlejeFormValues) => {
    setErrorMessage(null);

    try {
      console.log("Datos a enviar al servidor:", data); // Log para depuración
      const response = await fetch(APP_ROUTES.api.tubos.flejes, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al crear el fleje en el servidor.",
        );
      }
      toast.success("Fleje creado exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.flejes.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el fleje:", error);
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

      <FlejeForm onSubmit={handleSubmit} />
    </Box>
  );
}
