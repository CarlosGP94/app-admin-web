"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import MallaForm from "@/components/mallas/mallas/MallaForm";
import { MallaFormValues } from "@/components/mallas/mallas/MallaFormSchema";
import { APP_ROUTES } from "@/config/routes";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { toast } from "react-toastify";

interface ActualizarMallaPageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarMallaPage({
  params,
}: ActualizarMallaPageProps) {
  const permission = APP_ROUTES.mallas.subRoutes.mallas_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ActualizarMallaView params={params} />
    </ProtectedRoute>
  );
}

export function ActualizarMallaView({ params }: ActualizarMallaPageProps) {
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] = useState<MallaFormValues | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setTitleInfo(
      "Actualizar malla",
      "Modifica la información de la malla en los pasos indicados."
    );
  }, [setTitleInfo]);

  useEffect(() => {
    async function fetchMalla() {
      try {
        setLoading(true);

        const response = await fetch(
          APP_ROUTES.api.mallas.mallas_detalle(id)
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "No se pudo recuperar la información de la malla."
          );
        }

        const result = await response.json();
        setInitialData(result.data);
      } catch (error) {
        console.error("Error al obtener la malla:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar la malla."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchMalla();
    }
  }, [id]);

  const handleSubmit = async (data: MallaFormValues) => {
    try {
      const response = await fetch(APP_ROUTES.api.mallas.mallas, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, id: Number(id) }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al actualizar la malla en el servidor."
        );
      }

      toast.success("Malla actualizada correctamente.");
      router.push(APP_ROUTES.mallas.subRoutes.mallas.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar la malla:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un fallo inesperado al guardar la actualización."
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
      {initialData && (
        <MallaForm
          isEditing={true}
          initialData={initialData}
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
