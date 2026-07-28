"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation"; // Si el ID viene en la URL (ej: /produccion/[id])
import { Box, CircularProgress, Alert } from "@mui/material";
import { useLayoutTitle } from "../../layout";
import { APP_ROUTES } from "@/config/routes";
import ControlDimensionalForm from "@/components/tubos/produccion/ControlDimensionalForm";
import { ControlDimensionalFormValues } from "@/components/tubos/produccion/ControlDimensionalSchema";
import { toast } from "react-toastify";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

// Interfaz que coincide con la respuesta del nuevo servicio
interface ControlDimensionalDetalle {
  id: number;
  creado: string;
  maquina_id: number;
  medida_de: number;
  medida_hb: number;
  medida_espesor: number;
  medida_conv: number;
  medida_rectang: number;
  medida_redondeo: number;
  medida_revirado_alt: number;
  medida_rectitud: number;
  medida_long: number;
  medida_revirado_base: number;
  tubo_id: number;
  medida_va: number;
  maquina?: {
    id: number;
    nombre?: string;
  };
  tubo?: {
    id: number;
    espesor: number;
    ancho: number;
    alto: number;
    diametro: number;
    longitud: number;
    calidad_id: number;
  };
}

interface ProduccionViewProps {
  prodTuboId?: number; // Opcional si lo pasas directamente como prop
}

export default function ProduccionPage() {
  const permission = APP_ROUTES.tubos.subRoutes.produccion_control_dimensional
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ProduccionView />
    </ProtectedRoute>
  );
}

export function ProduccionView({ prodTuboId: propId }: ProduccionViewProps) {
  const { setTitleInfo } = useLayoutTitle();
  const params = useParams();
  const router = useRouter();

  // Si no viene por prop, intentamos tomar el id de los parámetros de la URL
  const prodTuboId = propId ?? Number(params?.id);

  const [controlData, setControlData] =
    useState<ControlDimensionalDetalle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setTitleInfo(
      "Control Dimensional",
      "Medidas realizadas antes de la producción.",
    );
  }, [setTitleInfo]);

  useEffect(() => {
    const fetchControlDimensional = async () => {
      if (!prodTuboId || isNaN(prodTuboId)) {
        setErrorMessage("No se ha proporcionado un ID de producción válido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        // Petición única directa al endpoint optimizado
        const res = await fetch(
          `${APP_ROUTES.api.tubos.produccion_control_dimensional(prodTuboId.toString())}`,
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            errorData.message || "Error al obtener el control dimensional.",
          );
        }

        const data: ControlDimensionalDetalle = await res.json();

        setControlData(data);
      } catch (err: unknown) {
        console.error("Error al cargar control dimensional:", err);
        const msg =
          err instanceof Error ? err.message : "Error al cargar los datos.";
        setErrorMessage(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchControlDimensional();
  }, [prodTuboId]);

  const handleSubmit = async (data: ControlDimensionalFormValues) => {
    setErrorMessage(null);

    try {
      const response = await fetch(
        `${APP_ROUTES.api.tubos.control_dimensional}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...data, id: Number(data?.id) }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Error al actualizar la bobina en el servidor.",
        );
      }
      toast.success("Control dimensional actualizado exitosamente.");
      router.push(APP_ROUTES.tubos.subRoutes.produccion.path);
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
          minHeight: "200px",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (errorMessage) {
    return (
      <Box sx={{ m: 2 }}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <ControlDimensionalForm
        initialData={{
          id: controlData?.id,
          maquina_id: controlData?.maquina_id,
          medida_de: controlData?.medida_de,
          medida_hb: controlData?.medida_hb,
          medida_espesor: controlData?.medida_espesor,
          medida_conv: controlData?.medida_conv,
          medida_rectang: controlData?.medida_rectang,
          medida_redondeo: controlData?.medida_redondeo,
          medida_revirado_alt: controlData?.medida_revirado_alt,
          medida_rectitud: controlData?.medida_rectitud,
          medida_long: controlData?.medida_long,
          medida_revirado_base: controlData?.medida_revirado_base,
          tubo_id: controlData?.tubo_id,
          medida_va: controlData?.medida_va,
          creado: controlData?.creado,
          tubo: {
            id: controlData?.tubo?.id ?? 0,
            espesor: controlData?.tubo?.espesor ?? 0,
            ancho: controlData?.tubo?.ancho ?? 0,
            alto: controlData?.tubo?.alto ?? 0,
            diametro: controlData?.tubo?.diametro ?? 0,
            longitud: controlData?.tubo?.longitud ?? 0,
            calidad_id: controlData?.tubo?.calidad_id ?? 0,
          },
        }}
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
