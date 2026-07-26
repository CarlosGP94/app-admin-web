// @/app/tubos/(gestion)/nuevo/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert } from "@mui/material";
import { PlanCorteFormValues } from "@/components/tubos/planesCorte/PlanesCorteFormSchema";
import { toast } from "react-toastify";
import PlanCorteForm from "@/components/tubos/planesCorte/PlanesCorteForm";

export default function NuevoPlanCortePage() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  // Estado opcional para notificar errores de la API al usuario
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitleInfo(
      "Crear nuevo plan de corte",
      "Aquí puedes registrar un nuevo plan de corte en el sistema.",
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: PlanCorteFormValues) => {
    setErrorMessage(null);

    try {
      console.log("Datos a enviar al servidor:", data); // Log para depuración
      const response = await fetch(APP_ROUTES.api.tubos.planes_corte, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            "Error al crear el plan de corte en el servidor.",
        );
      }
      toast.success("Plan de corte creado exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.planes_corte.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el plan de corte:", error);
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
      <PlanCorteForm onSubmit={handleSubmit} />
    </Box>
  );
}
