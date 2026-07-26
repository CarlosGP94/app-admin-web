// @/app/tubos/(gestion)/[id]/page.tsx
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import { FlejeFormValues } from "@/components/tubos/flejes/FlejeFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert, CircularProgress } from "@mui/material";
import PlanesCorteForm from "@/components/tubos/planesCorte/PlanesCorteForm";
import { PlanCorteFormValues } from "@/components/tubos/planesCorte/PlanesCorteFormSchema";
import { toast } from "react-toastify";

interface ActualizarPlanesCortePageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarPlanesCortePage({
  params,
}: ActualizarPlanesCortePageProps) {
  // Desenredamos los params de Next.js
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] = useState<PlanCorteFormValues | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Titular de la página
  useEffect(() => {
    setTitleInfo(
      "Actualizar Plan de Corte",
      "Modifica las dimensiones y especificaciones del plan de corte.",
    );
  }, [setTitleInfo]);

  // Cargar datos del plan de corte al montar la vista
  useEffect(() => {
    async function fetchPlanCorte() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Ajusta la URL según la ruta exacta de tu API (ej. /api/planes_corte/detalle/${id} o /api/planes_corte/${id})
        const response = await fetch(
          `${APP_ROUTES.api.tubos.planes_corte_detalle(id)}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              "No se pudo recuperar la información del plan de corte.",
          );
        }

        const data = await response.json();
        setInitialData(data);
      } catch (error) {
        console.error("Error al obtener el plan de corte:", error);
        setErrorMessage("Ocurrió un error al cargar el plan de corte.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPlanCorte();
    }
  }, [id]);

  // Envío de la actualización
  const handleSubmit = async (data: PlanCorteFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(`${APP_ROUTES.api.tubos.planes_corte}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: Number(id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            "Error al actualizar el plan de corte en el servidor.",
        );
      }
      toast.success("Plan de corte actualizado exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.planes_corte.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el plan de corte:", error);
      toast.error("Error al guardar el plan de corte.");
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
        <PlanesCorteForm
          isEditing={true}
          initialData={{
            ...initialData,
            calidad_id: Number(initialData.calidad_id),
            ancho_estipulado: Number(initialData.ancho_estipulado),
          }}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
