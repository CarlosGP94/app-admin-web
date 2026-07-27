"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ProduccionTuboFormValues,
  produccionTuboEditSchema,
} from "./ProduccionTuboSchema";

interface CalidadOption {
  id: number;
  nombre?: string;
  calidad?: string;
}

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
  calidad_id?: number;
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
  label?: string;
}

interface TurnoOption {
  id: number | string;
  label?: string;
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
  onSubmit: (data: ProduccionTuboFormValues) => Promise<void> | void;
  initialData?: RecordToEdit | null;
}) {
  // Contexto global / Layout props
  const { maquinas, operarios, turnos } = useTubosModule();

  // Estados locales
  const [calidades, setCalidades] = useState<CalidadOption[]>([]);
  const [loadingCalidades, setLoadingCalidades] = useState(false);

  const [tubos, setTubos] = useState<Tubo[]>([]);
  const [loadingTubos, setLoadingTubos] = useState(false);
  const [lotes, setLotes] = useState<LoteTubo[]>([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  const isEditing = Boolean(initialData && initialData.id);

  const methods = useForm<ProduccionTuboFormValues>({
    resolver: zodResolver(produccionTuboEditSchema),
    defaultValues: {
      id: initialData?.id ? Number(initialData.id) : undefined,
      operario_id: initialData?.operario_id
        ? Number(initialData.operario_id)
        : 0,
      turno_id: initialData?.turno_id ? Number(initialData.turno_id) : 0,
      maquina_id: initialData?.maquina_id ? Number(initialData.maquina_id) : 0,
      calidad_id: initialData?.calidad_id
        ? Number(initialData.calidad_id)
        : undefined,
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

  const { handleSubmit, watch, setValue, reset } = methods;

  const watchMaquinaId = watch("maquina_id");
  const watchCalidadId = watch("calidad_id");
  const watchTuboId = watch("tubo_id");
  const watchCreado = watch("creado");

  // Referencias para omitir el disparo del reseteo en la carga inicial / reset del form
  const isFirstRender = useRef(true);
  const prevMaquinaId = useRef<number | undefined>(watchMaquinaId);
  const prevCalidadId = useRef<number | undefined>(watchCalidadId);
  const prevTuboId = useRef<number | undefined>(watchTuboId);

  // Cargar catálogo de calidades al montar
  useEffect(() => {
    const fetchCalidades = async () => {
      try {
        setLoadingCalidades(true);
        const response = await fetch(APP_ROUTES.api.tubos.calidades);
        if (!response.ok) throw new Error("Error al obtener calidades");
        const result = await response.json();
        setCalidades(result?.data || result || []);
      } catch (err) {
        console.error("Error al cargar calidades:", err);
      } finally {
        setLoadingCalidades(false);
      }
    };

    fetchCalidades();
  }, []);

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
        calidad_id: initialData.calidad_id
          ? Number(initialData.calidad_id)
          : undefined,
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

      // Actualizar referencias al hacer reset
      prevMaquinaId.current = initialData.maquina_id
        ? Number(initialData.maquina_id)
        : 0;
      prevCalidadId.current = initialData.calidad_id
        ? Number(initialData.calidad_id)
        : undefined;
      prevTuboId.current = initialData.tubo_id
        ? Number(initialData.tubo_id)
        : 0;
    }
  }, [initialData, reset]);

  // =========================================================================
  // REGLAS DE NEGOCIO: RESETEO CASCADA DE CAMPOS
  // =========================================================================
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // 1. Al cambiar la Máquina o la Calidad -> tubo_id pasa a 0 y lote_tubo_id pasa a 0
    if (
      prevMaquinaId.current !== watchMaquinaId ||
      prevCalidadId.current !== watchCalidadId
    ) {
      setValue("tubo_id", 0, { shouldValidate: true });
      setValue("lote_tubo_id", 0, { shouldValidate: true });
      prevMaquinaId.current = watchMaquinaId;
      prevCalidadId.current = watchCalidadId;
      prevTuboId.current = 0;
      return;
    }

    // 2. Al cambiar el Tubo -> lote_tubo_id pasa a 0
    if (prevTuboId.current !== watchTuboId) {
      setValue("lote_tubo_id", 0, { shouldValidate: true });
      prevTuboId.current = watchTuboId;
    }
  }, [watchMaquinaId, watchCalidadId, watchTuboId, setValue]);

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

  // Carga de Lotes (Autocomplete) filtrados según el Tubo Y la Fecha seleccionada
  useEffect(() => {
    const fetchLotes = async () => {
      try {
        setLoadingLotes(true);
        const url = new URL(
          APP_ROUTES.api.tubos.lotes_tubos,
          window.location.origin,
        );

        if (watchMaquinaId) {
          url.searchParams.append("maquina_id", watchMaquinaId.toString());
        }

        if (watchCreado) {
          const fechaOnly = watchCreado.split("T")[0];
          if (fechaOnly) {
            url.searchParams.append("fecha", fechaOnly);
          }
        }

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
  }, [watchTuboId, watchCreado, watchMaquinaId]);

  const onSubmit = async (data: ProduccionTuboFormValues) => {
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
                  type="date"
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
                    label: op.label || "",
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
                    label: t.label || "",
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

              {/* CALIDAD */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  size="small"
                  control={methods.control}
                  name="calidad_id"
                  label="Calidad"
                  loading={loadingCalidades}
                  options={calidades.map((c) => ({
                    id: Number(c.id),
                    label: c.nombre || "",
                  }))}
                />
              </Grid>

              {/* TUBO ESPECIFICADO */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  size="small"
                  control={methods.control}
                  name="tubo_id"
                  label="Tubo"
                  loading={loadingTubos}
                  options={tubos.map((t) => ({
                    id: Number(t.id),
                    label: t.medida || `Tubo #${t.id}`,
                  }))}
                />
              </Grid>

              {/* LOTE DE TUBO (AUTOCOMPLETE) */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormAutocomplete
                  control={methods.control}
                  size="small"
                  name="lote_tubo_id"
                  label="Lote de Tubo"
                  required
                  loading={loadingLotes}
                  options={lotes.map((lote: LoteTubo) => ({
                    id: Number(lote.id),
                    label: lote.codigo || lote.lote || `Lote #${lote.id}`,
                  }))}
                />
              </Grid>

              {/* CONCENTRACIÓN TALADRINA */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="concentracion_taladrina"
                  label="Brix Taladrina"
                  type="number"
                  isNumber
                  fullWidth
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* MÉTRICAS DE PRODUCCIÓN Y UNIDADES */}
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
