"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Box, CircularProgress, Alert } from "@mui/material";
import { useLayoutTitle } from "../layout";
import { APP_ROUTES } from "@/config/routes";
import TablaAuditoriaProducciones, {
  BobinaOpcion,
  ProduccionConFlejes,
} from "@/components/tubos/produccion/ProduccionColadas";

// Tipos reflejando la respuesta del backend
interface FlejeDetalle {
  id: number;
  lote: string;
  bobina_id: number;
  bobina_concepto: string;
  colada_id: number;
  colada_nombre: string;
  auditoria_id: number | null;
  bobina_auditoria_id: number | null;
  bobina_auditoria_concepto: string | null;
  colada_auditoria_id: number | null;
  colada_auditoria_nombre: string | null;
}

interface ProdLoteTuboConFlejes {
  id: number;
  lote_tubo_id: number;
  tubo_id: number;
  tubo: string;
  lote: string;
  maquina: string;
  fecha: string;
  flejes: FlejeDetalle[];
}

export default function InsertarColadasPage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");
  const { setTitleInfo } = useLayoutTitle();

  const [producciones, setProducciones] = useState<ProdLoteTuboConFlejes[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Configurar título del Layout
  useEffect(() => {
    setTitleInfo(
      "Asignación de Coladas",
      "Asignar bobinas/coladas a lotes de tubos",
    );
  }, [setTitleInfo]);

  // --- FUNCIÓN REUTILIZABLE PARA CARGAR PRODUCCIONES ---
  const fetchProducciones = useCallback(async () => {
    if (!idsParam) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${APP_ROUTES.api.tubos.produccion_lotes_flejes}?ids=${idsParam}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al cargar las producciones");
      }

      setProducciones(result.data || []);
    } catch (err) {
      console.error("Error obteniendo producciones:", err);
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado",
      );
    } finally {
      setLoading(false);
    }
  }, [idsParam]);

  // Carga inicial
  useEffect(() => {
    // Evitar setState síncrono dentro del efecto: ejecutar de forma diferida
    const t = setTimeout(() => {
      void fetchProducciones();
    }, 0);

    return () => clearTimeout(t);
  }, [fetchProducciones]);

  // --- EXTRAER Y COMBINAR BOBINAS ÚNICAS ---
  const bobinasDisponibles = useMemo<BobinaOpcion[]>(() => {
    const mapaBobinas = new Map<number, BobinaOpcion>();

    producciones.forEach((prod) => {
      prod.flejes.forEach((fleje) => {
        if (fleje.bobina_id && !mapaBobinas.has(fleje.bobina_id)) {
          mapaBobinas.set(fleje.bobina_id, {
            id: fleje.bobina_id,
            codigo: fleje.bobina_concepto,
            coladaId: fleje.colada_id,
            coladaNombre: fleje.colada_nombre,
          });
        }
      });
    });

    return Array.from(mapaBobinas.values()).sort((a, b) =>
      a.codigo.localeCompare(b.codigo, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [producciones]);

  // --- ADAPTAR ESTRUCTURA DE PRODUCCIONES AL COMPONENTE HIJO ---
  const produccionesAdaptadas = useMemo<ProduccionConFlejes[]>(() => {
    if (!idsParam) return [];

    return producciones.map((p) => ({
      id: p.id,
      lote: p.lote,
      lote_tubo_id: p.lote_tubo_id,
      tubo_id: p.tubo_id,
      tubo: p.tubo,
      codigoProduccion: p.lote,
      maquina: p.maquina,
      fecha: p.fecha,
      flejes: p.flejes,
    }));
  }, [producciones, idsParam]);

  // --- FUNCIÓN PARA GUARDAR ASIGNACIÓN Y REFRESCAR ---
  const handleGuardarAsignacion = async (
    flejesIds: number[],
    bobinaId: string | number | null | undefined,
    coladaId: string | number,
  ) => {
    if (!bobinaId || !coladaId || flejesIds.length === 0) {
      setError(
        "Por favor, selecciona una bobina, una colada y al menos un fleje.",
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Usar la ruta configurada para la API de asignación de auditoría
      const response = await fetch(APP_ROUTES.api.tubos.auditoria, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          flejesIds: flejesIds.map((id) => String(id)),
          bobinaId: String(bobinaId),
          coladaId: String(coladaId),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Error al guardar la asignación.");
      }

      // Recargar las producciones para actualizar los valores mostrados en la tabla
      await fetchProducciones();
    } catch (err) {
      console.error("Error al guardar la asignación:", err);
      setError(
        err instanceof Error ? err.message : "Error al guardar la asignación.",
      );
      setLoading(false);
    }
  };

  if (loading && producciones.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      <TablaAuditoriaProducciones
        producciones={produccionesAdaptadas}
        bobinasDisponibles={bobinasDisponibles}
        onGuardarAsignacion={handleGuardarAsignacion}
      />
    </Box>
  );
}
