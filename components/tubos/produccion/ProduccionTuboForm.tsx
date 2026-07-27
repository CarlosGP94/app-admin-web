"use client";

import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Button,
  Grid,
  Typography,
  Stack,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import { Save, Edit } from "@mui/icons-material";
import { toast } from "react-toastify";
import { useTubosModule } from "@/app/tubos/layout";
import { FormSelect } from "@/components/commons/FormSelect";
import { FormTextField } from "@/components/commons/FormTextfield";
import { FormAutocomplete } from "@/components/commons/FormAutocomplete";
import { APP_ROUTES } from "@/config/routes";
import { getFechaLocalISO } from "@/utils/functions";
import {
  ProduccionTuboEditInput,
  produccionTuboEditSchema,
} from "./ProduccionTuboSchema";

interface Tubo {
  id: number;
  medida?: string;
  calidad_id?: number;
}

interface LoteTubo {
  id: number;
  codigo?: string;
  lote?: string;
}

interface RecordToEdit {
  id?: number;
  operario_id?: number;
  turno_id?: number;
  maquina_id?: number;
  tubo_id?: number;
  lote_tubo_id?: number;
  cant_tubos_buenos?: number;
  cant_tubos_malos?: number;
  paquetes?: number;
  concentracion_taladrina?: number | null;
  observacion?: string | null;
  creado?: string;
}

interface OperarioOption {
  id: number | string;
  nombre?: string;
  operario?: string;
}

interface TurnoOption {
  id: number | string;
  nombre?: string;
  turno?: string;
}

interface MaquinaOption {
  id: number | string;
  maquina?: string;
  nombre?: string;
}

export default function ProduccionTuboForm({
  onSubmit: onSubmitProp,
  initialData = null,
}: {
  onSubmit: (data: ProduccionTuboEditInput) => Promise<void> | void;
  initialData?: RecordToEdit | null;
}) {
  // Contexto global / Layout props
  const { maquinas, operarios, turnos } = useTubosModule();
  console.log("turnos:", turnos);
  console.log("Operarios:", operarios);

  // Estados locales
  const [tubos, setTubos] = useState<Tubo[]>([]);
  const [loadingTubos, setLoadingTubos] = useState(false);
  const [lotes, setLotes] = useState<LoteTubo[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  const isEditing = Boolean(initialData && initialData.id);

  const methods = useForm<ProduccionTuboEditInput>({
    resolver: zodResolver(produccionTuboEditSchema),
    defaultValues: {
      id: initialData?.id ? Number(initialData.id) : undefined,
      operario_id: initialData?.operario_id
        ? Number(initialData.operario_id)
        : 0,
      turno_id: initialData?.turno_id ? Number(initialData.turno_id) : 0,
      maquina_id: initialData?.maquina_id ? Number(initialData.maquina_id) : 0,
      tubo_id: initialData?.tubo_id ? Number(initialData.tubo_id) : 0,
      lote_tubo_id: initialData?.lote_tubo_id
        ? Number(initialData.lote_tubo_id)
        : 0,
      cant_tubos_buenos: initialData?.cant_tubos_buenos ?? 0,
      cant_tubos_malos: initialData?.cant_tubos_malos ?? 0,
      paquetes: initialData?.paquetes ?? 0,
      concentracion_taladrina: initialData?.concentracion_taladrina ?? 0,
      observacion: initialData?.observacion ?? "",
      creado: getFechaLocalISO(initialData?.creado),
    },
  });

  const { handleSubmit, watch, reset } = methods;

  const watchMaquinaId = watch("maquina_id");
  const watchTuboId = watch("tubo_id");

  // Reset del formulario cuando cambia el initialData
  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id ? Number(initialData.id) : undefined,
        operario_id: initialData.operario_id
          ? Number(initialData.operario_id)
          : 0,
        turno_id: initialData.turno_id ? Number(initialData.turno_id) : 0,
        maquina_id: initialData.maquina_id ? Number(initialData.maquina_id) : 0,
        tubo_id: initialData.tubo_id ? Number(initialData.tubo_id) : 0,
        lote_tubo_id: initialData.lote_tubo_id
          ? Number(initialData.lote_tubo_id)
          : 0,
        cant_tubos_buenos: initialData.cant_tubos_buenos ?? 0,
        cant_tubos_malos: initialData.cant_tubos_malos ?? 0,
        paquetes: initialData.paquetes ?? 0,
        concentracion_taladrina: initialData.concentracion_taladrina ?? 0,
        observacion: initialData.observacion ?? "",
        creado: getFechaLocalISO(initialData?.creado),
      });
    }
  }, [initialData, reset]);

  // Obtención de Tubos según la Máquina
  useEffect(() => {
    const fetchTubos = async () => {
      if (!watchMaquinaId) {
        setTubos([]);
        return;
      }
      try {
        setLoadingTubos(true);
        const url = new URL(
          APP_ROUTES.api.tubos.tubos_all,
          window.location.origin,
        );
        url.searchParams.append("maquina_id", watchMaquinaId.toString());

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Error al consultar tubos");
        const result = await response.json();
        setTubos(result?.data || []);
      } catch (err) {
        console.error("Error al obtener el catálogo de tubos:", err);
        toast.error("Error al obtener los tubos para la máquina seleccionada");
      } finally {
        setLoadingTubos(false);
      }
    };

    fetchTubos();
  }, [watchMaquinaId]);

  // Carga de Lotes (Autocomplete) filtrados según el Tubo o globalmente
  useEffect(() => {
    const fetchLotes = async () => {
      try {
        setLoadingLotes(true);
        const url = new URL(
          APP_ROUTES.api.tubos.lotes_tubo,
          window.location.origin,
        );
        if (watchTuboId)
          url.searchParams.append("tubo_id", watchTuboId.toString());

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Error al consultar lotes");
        const result = await response.json();
        setLotes(result?.data || result || []);
      } catch (err) {
        console.error("Error al cargar lotes de tubo:", err);
      } finally {
        setLoadingLotes(false);
      }
    };

    fetchLotes();
  }, [watchTuboId]);

  const onSubmit = async (data: ProduccionTuboEditInput) => {
    await onSubmitProp(data);
  };

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {/* CABECERA: DATOS OPERATIVOS */}
        <Card elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Datos del Turno y Proceso
            </Typography>

            <Grid container spacing={2}>
              {/* FECHA */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="creado"
                  type="datetime-local"
                  label="Fecha / Hora Registro"
                  fullWidth
                />
              </Grid>

              {/* OPERARIO */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  control={methods.control}
                  size="small"
                  name="operario_id"
                  label="Operario"
                  options={(operarios || []).map((op: OperarioOption) => ({
                    id: Number(op.id),
                    label: op.nombre || op.operario || "",
                  }))}
                />
              </Grid>

              {/* TURNO */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  control={methods.control}
                  size="small"
                  name="turno_id"
                  label="Turno"
                  options={(turnos || []).map((t: TurnoOption) => ({
                    id: Number(t.id),
                    label: t.nombre || t.turno || "",
                  }))}
                />
              </Grid>

              {/* MÁQUINA */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  control={methods.control}
                  size="small"
                  name="maquina_id"
                  label="Máquina"
                  options={(maquinas || []).map((m: MaquinaOption) => ({
                    id: Number(m.id),
                    label: m.maquina || m.nombre || "",
                  }))}
                />
              </Grid>

              {/* TUBO ESPECIFICADO */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormSelect
                  size="small"
                  control={methods.control}
                  name="tubo_id"
                  label="Tubo a Fabricar"
                  loading={loadingTubos}
                  disabled={!watchMaquinaId || tubos.length === 0}
                  options={tubos.map((t) => ({
                    id: Number(t.id),
                    label: t.medida || `Tubo #${t.id}`,
                  }))}
                />
              </Grid>

              {/* LOTE DE TUBO (AUTOCOMPLETE) */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormAutocomplete
                  control={methods.control}
                  size="small"
                  name="lote_tubo_id"
                  label="Lote de Tubo"
                  required
                  loading={loadingLotes}
                  disabled={!watchTuboId || lotes.length === 0}
                  options={lotes.map((lote: LoteTubo) => ({
                    id: Number(lote.id),
                    label: lote.codigo || lote.lote || `Lote #${lote.id}`,
                  }))}
                />
              </Grid>

              {/* CONCENTRACIÓN TALADRINA */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="concentracion_taladrina"
                  label="Concentración Taladrina (%)"
                  type="number"
                  isNumber
                  fullWidth
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* METRICAS DE PRODUCCIÓN Y UNIDADES */}
        <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Cantidades y Paquetes
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="cant_tubos_buenos"
                  label="Tubos Buenos"
                  type="number"
                  isNumber
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="cant_tubos_malos"
                  label="Tubos Malos / Rechazos"
                  type="number"
                  isNumber
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="paquetes"
                  label="Paquetes Producidos"
                  type="number"
                  isNumber
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="observacion"
                  label="Observaciones"
                  multiline
                  rows={2}
                  fullWidth
                />
              </Grid>
            </Grid>

            {/* BOTÓN SUBMIT */}
            <Divider sx={{ my: 3 }} />
            <Stack
              direction="row"
              spacing={2}
              sx={{ justifyContent: "flex-end" }}
            >
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                startIcon={isEditing ? <Edit /> : <Save />}
                sx={{ px: 4, borderRadius: 2 }}
              >
                {isEditing ? "Actualizar Producción" : "Guardar Producción"}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </FormProvider>
  );
}
