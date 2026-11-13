"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../../layout";
import CertificadoForm, {
  CertificadoFormSubmitValues,
} from "@/components/mallas/certificados/CertificadoForm";
import { APP_ROUTES } from "@/config/routes";
import { Box, CircularProgress } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { toast } from "react-toastify";

interface CertificadoDetalle {
  id: number;
  certificado: string;
  imagen: string | null;
  creado: string;
}

interface ActualizarCertificadoPageProps {
  params: Promise<{ id: string }>;
}

export default function ActualizarCertificadoPage({
  params,
}: ActualizarCertificadoPageProps) {
  const permission = APP_ROUTES.mallas.subRoutes.certificados_edit
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ActualizarCertificadoView params={params} />
    </ProtectedRoute>
  );
}

export function ActualizarCertificadoView({
  params,
}: ActualizarCertificadoPageProps) {
  const { id } = use(params);
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  const [initialData, setInitialData] = useState<CertificadoDetalle | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setTitleInfo(
      "Actualizar certificado",
      "Modifica el nombre o reemplaza la imagen del certificado."
    );
  }, [setTitleInfo]);

  useEffect(() => {
    async function fetchCertificado() {
      try {
        setLoading(true);

        const response = await fetch(
          APP_ROUTES.api.mallas.certificados_detalle(id)
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.message ||
              "No se pudo recuperar la información del certificado."
          );
        }

        const result = await response.json();
        setInitialData(result.data);
      } catch (error) {
        console.error("Error al obtener el certificado:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Ocurrió un error al cargar el certificado."
        );
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchCertificado();
    }
  }, [id]);

  const handleSubmit = async (data: CertificadoFormSubmitValues) => {
    try {
      const formData = new FormData();
      formData.append("certificado", data.certificado);
      if (data.imagen) {
        formData.append("imagen", data.imagen);
      }

      const response = await fetch(
        APP_ROUTES.api.mallas.certificados_detalle(id),
        {
          method: "PUT",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al actualizar el certificado en el servidor."
        );
      }

      toast.success("Certificado actualizado correctamente.");
      router.push(APP_ROUTES.mallas.subRoutes.certificados.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el certificado:", error);
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
        <CertificadoForm
          isEditing={true}
          initialData={initialData}
          existingImageUrl={
            initialData.imagen
              ? `${APP_ROUTES.api.mallas.certificados_imagen(
                  initialData.id
                )}?v=${encodeURIComponent(initialData.imagen)}`
              : null
          }
          onSubmit={handleSubmit}
        />
      )}
    </Box>
  );
}
