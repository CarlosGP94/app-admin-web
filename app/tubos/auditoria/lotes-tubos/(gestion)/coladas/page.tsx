"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLayoutTitle } from "../layout"; // Ajusta según la estructura de tu layout
import { APP_ROUTES } from "@/config/routes";
import { Box, CircularProgress, Alert } from "@mui/material";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import TablaAuditoriaLotes, {
  BobinaOpcion,
} from "@/components/tubos/lotesTubos/LotesTubosColadas";
import { LoteTuboConFlejes } from "@/lib/services/lotes-tubos.service";

export default function LotesTubosColadasPage() {
  const permission = APP_ROUTES.tubos.subRoutes.produccion_create
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    // <ProtectedRoute requiredPermission={permission}>
    <LotesTubosColadasView />
    // </ProtectedRoute>
  );
}

export function LotesTubosColadasView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTitleInfo } = useLayoutTitle();

  // 1. Estados para los datos de la vista
  const [lotesTubos, setLotesTubos] = useState<LoteTuboConFlejes[]>([]);
  const [bobinasDisponibles, setBobinasDisponibles] = useState<BobinaOpcion[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Configurar título del Layout
  useEffect(() => {
    setTitleInfo(
      "Asignación de Coladas",
      "Asignar bobinas/coladas a lotes de tubos",
    );
  }, [setTitleInfo]);

  // 2. Cargar los datos desde el servicio / API Route
  const fetchDatosColadas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const idsQuery = searchParams.get("ids");
      if (!idsQuery) {
        setError("No se han seleccionado lotes de tubos para procesar.");
        setLoading(false);
        return;
      }

      // Consumir el endpoint para obtener detalles de los lotes e información de bobinas
      const url = new URL(
        APP_ROUTES.api.tubos.lotes_tubos_flejes,
        window.location.origin,
      );
      url.searchParams.append("ids", idsQuery);

      const response = await fetch(url.toString());
      if (!response.ok)
        throw new Error("Error al consultar los detalles de coladas");

      const result = await response.json();

      if (result.success) {
        setLotesTubos(result.data || []);
        setBobinasDisponibles([]);
      } else {
        throw new Error(result.error || "No se pudieron obtener los datos");
      }
    } catch (err: unknown) {
      console.error("❌ Error al cargar coladas:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar la información",
      );
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    void Promise.resolve().then(fetchDatosColadas);
  }, [fetchDatosColadas]);

  // 3. Handler para guardar la asignación
  const handleGuardarAsignacion = async (payload: unknown) => {
    try {
      const response = await fetch(
        APP_ROUTES.api.tubos.lotes_tubos_flejes || "/api/tubos/lotes/coladas",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok)
        throw new Error("Error al guardar la asignación de coladas");

      const result = await response.json();
      if (result.success) {
        // Redirigir de vuelta al listado tras guardar con éxito
        router.push(APP_ROUTES.tubos.subRoutes.lotes_tubos.path);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (err) {
      console.error("❌ Error al guardar:", err);
      alert("Hubo un fallo al intentar guardar la asignación.");
    }
  };

  // 4. Renderizado según estado
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 8,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <TablaAuditoriaLotes
        lotesTubos={lotesTubos}
        bobinasDisponibles={bobinasDisponibles}
        onGuardarAsignacion={handleGuardarAsignacion}
      />
    </Box>
  );
}
