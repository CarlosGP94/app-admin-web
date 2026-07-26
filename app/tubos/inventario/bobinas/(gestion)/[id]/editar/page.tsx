// @/app/tubos/(gestion)/[id]/page.tsx
"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import { APP_ROUTES } from "@/config/routes";
import { Box, Alert, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import BobinaForm from "@/components/tubos/bobinas/BobinaForm";
import { BobinaFormValues } from "@/components/tubos/bobinas/BobinaFormSchema";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface ActualizarBobinaPageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarBobinaPage({
  params,
}: ActualizarBobinaPageProps) {
  const permission = APP_ROUTES.tubos.subRoutes.bobinas_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ActualizarBobinaView params={params} />
    </ProtectedRoute>
  );
}

export function ActualizarBobinaView({ params }: ActualizarBobinaPageProps) {
  // Desenredamos los params de Next.js
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] = useState<BobinaFormValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Titular de la página
  useEffect(() => {
    setTitleInfo(
      "Actualizar Bobina",
      "Modifica las dimensiones y especificaciones de la bobina.",
    );
  }, [setTitleInfo]);

  // Cargar datos de la bobina al montar la vista
  useEffect(() => {
    async function fetchBobina() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Ajusta la URL según la ruta exacta de tu API (ej. /api/bobinas/detalle/${id} o /api/bobinas/${id})
        const response = await fetch(
          `${APP_ROUTES.api.tubos.bobinas_detalle(id)}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              "No se pudo recuperar la información de la bobina.",
          );
        }

        const data = await response.json();
        setInitialData(data);
      } catch (error) {
        console.error("Error al obtener la bobina:", error);
        setErrorMessage("Ocurrió un error al cargar la bobina.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchBobina();
    }
  }, [id]);

  // Envío de la actualización
  const handleSubmit = async (data: BobinaFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(`${APP_ROUTES.api.tubos.bobinas}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: Number(id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al actualizar la bobina en el servidor.",
        );
      }
      toast.success("Bobina actualizada exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.bobinas.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar la bobina:", error);
      toast.error("Error al guardar la bobina.");
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
        <BobinaForm
          isEditing={true}
          initialData={{
            ...initialData,
            calidad_id: Number(initialData.calidad_id),
            fabricante_id: Number(initialData.fabricante_id),
          }}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
