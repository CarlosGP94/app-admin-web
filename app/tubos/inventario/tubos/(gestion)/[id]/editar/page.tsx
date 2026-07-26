// @/app/tubos/(gestion)/[id]/page.tsx
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import TuboForm from "@/components/tubos/tubos/TubosForm";
import { TuboFormValues } from "@/components/tubos/tubos/TuboFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert, CircularProgress } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface ActualizarTuboPageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarTuboPage({
  params,
}: ActualizarTuboPageProps) {
  const permission = APP_ROUTES.tubos.subRoutes.tubos_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ActualizarTuboView params={params} />
    </ProtectedRoute>
  );
}

export function ActualizarTuboView({ params }: ActualizarTuboPageProps) {
  // Desenredamos los params de Next.js
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] = useState<TuboFormValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Titular de la página
  useEffect(() => {
    setTitleInfo(
      "Actualizar Tubo",
      "Modifica las dimensiones y especificaciones del tubo.",
    );
  }, [setTitleInfo]);

  // Cargar datos del tubo al montar la vista
  useEffect(() => {
    async function fetchTubo() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Ajusta la URL según la ruta exacta de tu API (ej. /api/tubos/detalle/${id} o /api/tubos/${id})
        const response = await fetch(
          `${APP_ROUTES.api.tubos.tubos_detalle(id)}`,
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
      fetchTubo();
    }
  }, [id]);

  // Envío de la actualización
  const handleSubmit = async (data: TuboFormValues) => {
    setErrorMessage(null);
    console.log("Datos a enviar al servidor:", data);

    try {
      const response = await fetch(`${APP_ROUTES.api.tubos.tubos}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: Number(id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al actualizar el tubo en el servidor.",
        );
      }

      router.push(APP_ROUTES.tubos.subRoutes.tubos.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el tubo:", error);
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
        <TuboForm
          isEditing={true}
          initialData={{
            ...initialData,
            calidad_id: Number(initialData.calidad_id),
            tipo_id: Number(initialData.tipo_id),
            maquinasConfig:
              initialData.maquinasConfig?.map((m) => ({
                ...m,
                flejes_ids: m.flejes_ids?.map((id) => Number(id)) || [],
              })) || [],
          }}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
