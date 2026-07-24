"use client";

import React, { useEffect } from "react";
import { useForm, Controller, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  Divider,
  Alert,
  AlertTitle,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import WarningIcon from "@mui/icons-material/Warning";
import { bobinaSchema, BobinaFormValues } from "./BobinaFormSchema";
import { FormSelect } from "@/components/commons/FormSelect";
import { FormTextField } from "@/components/commons/FormTextfield";
import { toast } from "react-toastify";
import { useTubosModule } from "@/app/tubos/layout";

interface BobinaFormProps {
  initialData?: Partial<BobinaFormValues>;
  isEditing?: boolean;
  onSubmit: (data: BobinaFormValues) => Promise<void> | void;
}

export default function BobinaForm({
  initialData,
  isEditing = false,
  onSubmit: onSubmitProp,
}: BobinaFormProps) {
  // Obtener catálogos desde el contexto de la aplicación
  const {
    calidades,
    loadingCalidades,
    fabricantes = [],
    loadingFabricantes = false,
  } = useTubosModule();

  const defaultValues: BobinaFormValues = {
    fabricante_id: 0,
    calidad_id: 0,
    concepto: "",
    espesor: 0,
    ancho: 0,
    peso_medio: 0,
    unidades: 0,
    peso_total: 0,
    ...initialData,
    activa: initialData?.activa ?? true,
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<BobinaFormValues>({
    resolver: zodResolver(bobinaSchema),
    defaultValues,
  });

  // Observadores de campos
  const watchAncho = Number(watch("ancho")) || 0;
  const watchEspesor = Number(watch("espesor")) || 0;
  const watchCalidadId = watch("calidad_id");
  const watchUnidades = watch("unidades");
  const watchPesoMedio = watch("peso_medio");

  // Validación para advertencias en tiempo real
  const warningEspesor = watchEspesor > 6;
  const warningAncho =
    watchAncho > 0 && (watchAncho < 1000 || watchAncho > 2000);
  const showWarning = warningEspesor || warningAncho;

  // 1. Sincronización automática del concepto
  useEffect(() => {
    if (watchAncho > 0 && watchEspesor > 0) {
      const calidadObj = calidades.find(
        (c) => Number(c.id) === Number(watchCalidadId),
      );
      const calidadNom = calidadObj?.label_fleje || calidadObj?.nombre || "";

      const conceptoGenerado =
        `BOBINA ${calidadNom ? `${calidadNom.toUpperCase()} ` : ""}${watchAncho}x${watchEspesor}`.trim();

      setValue("concepto", conceptoGenerado, { shouldValidate: true });
    }
  }, [watchAncho, watchEspesor, watchCalidadId, calidades, setValue]);

  // 2. Cálculo automático del peso total (unidades * peso_medio)
  useEffect(() => {
    const uds = Number(watchUnidades) || 0;
    const pm = Number(watchPesoMedio) || 0;
    const totalCalculado = Number((uds * pm).toFixed(2));

    setValue("peso_total", totalCalculado, { shouldValidate: true });
  }, [watchUnidades, watchPesoMedio, setValue]);

  const onSubmit = async (data: BobinaFormValues) => {
    await onSubmitProp(data);
  };

  const onError = (_formErrors: FieldErrors<BobinaFormValues>) => {
    toast.error(
      "Hay errores en el formulario. Revisa los campos requeridos antes de guardar.",
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit, onError)} noValidate>
      <Stack spacing={3}>
        {/* CARD 1: INFORMACIÓN GENERAL */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Información General
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 9 }}>
                <FormTextField
                  disabled
                  name="concepto"
                  control={control}
                  label="Concepto / Denominación Comercial"
                  required
                />
              </Grid>
              <Grid
                size={{ xs: 12, sm: 3 }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Controller
                  name="activa"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label={field.value ? "Activa" : "Inactiva"}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormSelect
                  name="fabricante_id"
                  control={control}
                  label="Fabricante"
                  required
                  options={fabricantes.map(
                    (f: { id: number; nombre: string }) => ({
                      id: Number(f.id),
                      label: f.nombre || `Fabricante ${f.id}`,
                    }),
                  )}
                  loading={loadingFabricantes}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormSelect
                  name="calidad_id"
                  control={control}
                  label="Calidad"
                  required
                  options={calidades.map((c) => ({
                    id: Number(c.id),
                    label: c.nombre || c.label_fleje || `Calidad ${c.id}`,
                  }))}
                  loading={loadingCalidades}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* CARD 2: DIMENSIONES */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Dimensiones
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormTextField
                  name="ancho"
                  type="number"
                  control={control}
                  label="Ancho (mm)"
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormTextField
                  name="espesor"
                  type="number"
                  control={control}
                  label="Espesor (mm)"
                  required
                />
              </Grid>

              {/* ALERTA VISUAL DE DIMENSIONES FUERA DE RANGO */}
              {showWarning && (
                <Grid size={{ xs: 12 }}>
                  <Alert
                    severity="warning"
                    icon={<WarningIcon fontSize="inherit" />}
                  >
                    <AlertTitle>Atención con las dimensiones</AlertTitle>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {warningEspesor && (
                        <li>
                          El espesor introducido (
                          <strong>{watchEspesor} mm</strong>) supera los 6 mm
                          habituales.
                        </li>
                      )}
                      {warningAncho && (
                        <li>
                          El ancho introducido (<strong>{watchAncho} mm</strong>
                          ) está fuera del rango estándar (1000 - 2000 mm).
                        </li>
                      )}
                    </ul>
                  </Alert>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        {/* CARD 3: INVENTARIO Y PESOS */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Inventario y Pesos
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormTextField
                  name="unidades"
                  type="number"
                  control={control}
                  label="Unidades"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormTextField
                  name="peso_medio"
                  type="number"
                  control={control}
                  label="Peso Medio (Tn)"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormTextField
                  disabled
                  name="peso_total"
                  type="number"
                  control={control}
                  label="Peso Total (Tn)"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Stack>

      {/* BOTÓN DE GUARDADO */}
      <Divider sx={{ my: 4 }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          disabled={isSubmitting}
          sx={{ minWidth: 180, textTransform: "none", fontWeight: 600 }}
        >
          {isSubmitting
            ? "Guardando..."
            : isEditing
              ? "Actualizar Bobina"
              : "Crear Bobina"}
        </Button>
      </Box>
    </Box>
  );
}
