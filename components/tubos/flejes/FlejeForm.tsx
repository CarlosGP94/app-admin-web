// @/components/flejes/FlejeForm.tsx
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
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { flejeSchema, FlejeFormValues } from "./FlejeFormSchema";
import { FormSelect } from "@/components/commons/FormSelect";
import { FormTextField } from "@/components/commons/FormTextfield";
import { toast } from "react-toastify";
import { useTubosModule } from "@/app/tubos/layout";

interface FlejeFormProps {
  initialData?: Partial<FlejeFormValues>;
  isEditing?: boolean;
  onSubmit: (data: FlejeFormValues) => Promise<void> | void;
}

export default function FlejeForm({
  initialData,
  isEditing = false,
  onSubmit: onSubmitProp,
}: FlejeFormProps) {
  // Obtener calidades desde el contexto
  const { calidades, loadingCalidades } = useTubosModule();

  const defaultValues: FlejeFormValues = {
    calidad_id: 0,
    activo: true,
    ancho: 0,
    espesor: 0,
    concepto: "",
    art_concepto: "",
    unidades: 0,
    peso_medio: 0,
    peso_total: 0,
    ...initialData,
  };
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FlejeFormValues>({
    resolver: zodResolver(flejeSchema), // Evita la desincronización de tipos Input/Output de RHF
    defaultValues,
  });
  // Observadores de campos
  const watchAncho = watch("ancho");
  const watchEspesor = watch("espesor");
  const watchCalidadId = watch("calidad_id");
  const watchUnidades = watch("unidades");
  const watchPesoMedio = watch("peso_medio");

  // 1. Generación y sincronización automática del concepto
  useEffect(() => {
    if (watchAncho > 0 && watchEspesor > 0) {
      const calidadObj = calidades.find((c) => Number(c.id) === watchCalidadId);
      const calidadNom =
        calidadObj && calidadObj.label_fleje
          ? calidadObj.label_fleje.toUpperCase()
          : "";

      const conceptoGenerado =
        `FLEJE ${calidadNom ? `${calidadNom} ` : ""}${watchAncho}x${watchEspesor}`.trim();

      setValue("concepto", conceptoGenerado.toUpperCase(), {
        shouldValidate: true,
      });
      setValue("art_concepto", conceptoGenerado.toUpperCase(), {
        shouldValidate: true,
      });
    }
  }, [watchAncho, watchEspesor, watchCalidadId, calidades, setValue]);

  // 2. Cálculo automático del peso total (unidades * peso_medio)
  useEffect(() => {
    const uds = Number(watchUnidades) || 0;
    const pm = Number(watchPesoMedio) || 0;
    const totalCalculado = Number((uds * pm).toFixed(2));

    setValue("peso_total", totalCalculado, { shouldValidate: true });
  }, [watchUnidades, watchPesoMedio, setValue]);

  const onSubmit = async (data: FlejeFormValues) => {
    await onSubmitProp(data);
  };

  const onError = (_formErrors: FieldErrors<FlejeFormValues>) => {
    toast.error(
      "Hay errores en el formulario. Revisa los campos requeridos antes de guardar.",
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit, onError)} noValidate>
      <Stack spacing={3}>
        {/* CARD 1: INFORMACIÓN BÁSICA */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Información Básica
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
                  name="activo"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      }
                      label={field.value ? "Activo" : "Inactivo"}
                    />
                  )}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
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
              ? "Actualizar Fleje"
              : "Crear Fleje"}
        </Button>
      </Box>
    </Box>
  );
}
