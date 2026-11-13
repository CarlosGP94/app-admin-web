"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLayoutTitle } from "../layout";
import CertificadoForm, {
  CertificadoFormSubmitValues,
} from "@/components/mallas/certificados/CertificadoForm";
import { APP_ROUTES } from "@/config/routes";
import { Box } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { toast } from "react-toastify";

export default function NuevoCertificadoPage() {
  const permission = APP_ROUTES.mallas.subRoutes.certificados_create
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <NuevoCertificadoView />
    </ProtectedRoute>
  );
}

export function NuevoCertificadoView() {
  const { setTitleInfo } = useLayoutTitle();
  const router = useRouter();

  useEffect(() => {
    setTitleInfo(
      "Crear nuevo certificado",
      "Registra el nombre y la imagen del certificado."
    );
  }, [setTitleInfo]);

  const handleSubmit = async (data: CertificadoFormSubmitValues) => {
    try {
      const formData = new FormData();
      formData.append("certificado", data.certificado);
      if (data.imagen) {
        formData.append("imagen", data.imagen);
      }

      const response = await fetch(APP_ROUTES.api.mallas.certificados, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al crear el certificado en el servidor."
        );
      }

      toast.success("Certificado creado correctamente.");
      router.push(APP_ROUTES.mallas.subRoutes.certificados.path);
      router.refresh();
    } catch (error) {
      console.error("Error al guardar el certificado:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un fallo inesperado al guardar."
      );
    }
  };

  return (
    <Box>
      <CertificadoForm isEditing={false} onSubmit={handleSubmit} />
    </Box>
  );
}
