"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import MallaForm from "@/components/mallas/mallas/MallaForm";
import { MallaFormValues } from "@/components/mallas/mallas/MallaFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { toast } from "react-toastify";

export default function NuevaMallaPage() {
  const permission = APP_ROUTES.mallas.subRoutes.mallas_create
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <NuevaMallaView />
    </ProtectedRoute>
  );
}

export function NuevaMallaView() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  useEffect(() => {
    setTitleInfo(
      "Crear nueva malla",
      "Completa la información de la malla en los pasos indicados."
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: MallaFormValues) => {
    try {
      const response = await fetch(APP_ROUTES.api.mallas.mallas, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al crear la malla en el servidor."
        );
      }

      toast.success("Malla creada correctamente.");
      router.push(APP_ROUTES.mallas.subRoutes.mallas.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar la malla:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un fallo inesperado al guardar."
      );
    }
  };

  return (
    <Box>
      <MallaForm isEditing={false} onSubmit={handleSubmit} />
    </Box>
  );
}
