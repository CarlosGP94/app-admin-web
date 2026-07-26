// @/app/tubos/(gestion)/[id]/page.tsx
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import { FlejeFormValues } from "@/components/tubos/flejes/FlejeFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert, CircularProgress } from "@mui/material";
import FlejeForm from "@/components/tubos/flejes/FlejeForm";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface ActualizarFlejePageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarFlejePage({
  params,
}: ActualizarFlejePageProps) {
  const permission = APP_ROUTES.tubos.subRoutes.flejes_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ActualizarFlejeView params={params} />
    </ProtectedRoute>
  );
}

export function ActualizarFlejeView({ params }: ActualizarFlejePageProps) {
  // Desenredamos los params de Next.js
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] = useState<FlejeFormValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Titular de la página
  useEffect(() => {
    setTitleInfo(
      "Actualizar Fleje",
      "Modifica las dimensiones y especificaciones del fleje.",
    );
  }, [setTitleInfo]);

  // Cargar datos del fleje al montar la vista
  useEffect(() => {
    async function fetchFleje() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Ajusta la URL según la ruta exacta de tu API (ej. /api/flejes/detalle/${id} o /api/flejes/${id})
        const response = await fetch(
          `${APP_ROUTES.api.tubos.flejes_detalle(id)}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              "No se pudo recuperar la información del tubo.",
          );
        }

        const data = await response.json();
        setInitialData(data);
      } catch (error) {
        console.error("Error al obtener el tubo:", error);
        setErrorMessage("Ocurrió un error al cargar el tubo.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchFleje();
    }
  }, [id]);

  // Envío de la actualización
  const handleSubmit = async (data: FlejeFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(`${APP_ROUTES.api.tubos.flejes}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: Number(id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al actualizar el fleje en el servidor.",
        );
      }
      toast.success("Fleje actualizado exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.flejes.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el fleje:", error);
      toast.error("Error al guardar el fleje.");
      setErrorMessage(
        "Ocurrió un fallo inesperado al guardar la actualización.",
      );
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {errorMessage && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}

      {initialData && (
        <FlejeForm
          isEditing={true}
          initialData={{
            ...initialData,
            calidad_id: Number(initialData.calidad_id),
          }}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
