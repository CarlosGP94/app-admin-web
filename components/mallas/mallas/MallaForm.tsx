"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Stack,
  CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ErrorIcon from "@mui/icons-material/Error";
import VerifiedIcon from "@mui/icons-material/Verified";
import { mallaSchema, MallaFormValues } from "./MallaFormSchema";
import { useMallasModule } from "@/app/mallas/layout";
import { FormTextField } from "@/components/commons/FormTextfield";
import { FormSelect } from "@/components/commons/FormSelect";
import { APP_ROUTES } from "@/config/routes";
import { toast } from "react-toastify";

interface CertificadoOption {
  id: number;
  certificado: string;
  imagen: string | null;
}

interface MallaFormProps {
  initialData?: Partial<MallaFormValues>;
  isEditing?: boolean;
  onSubmit: (data: MallaFormValues) => Promise<void> | void;
}

export default function MallaForm({
  initialData,
  isEditing = false,
  onSubmit: onSubmitProp,
}: MallaFormProps) {
  const { regiones, loadingRegiones } = useMallasModule();
  const [activeTab, setActiveTab] = useState(0);
  const [certificados, setCertificados] = useState<CertificadoOption[]>([]);
  const [loadingCertificados, setLoadingCertificados] = useState(true);

  const defaultValues: MallaFormValues = {
    codigo: initialData?.codigo ?? "",
    art_codigo: initialData?.art_codigo ?? "",
    designacion: initialData?.designacion ?? "",
    art_concepto: initialData?.art_concepto ?? "",
    activo: initialData?.activo ?? true,
    diametro: initialData?.diametro ?? 0,
    ancho: initialData?.ancho ?? 0,
    largo: initialData?.largo ?? 0,
    longitudinales: initialData?.longitudinales ?? 0,
    transversales: initialData?.transversales ?? 0,
    sl: initialData?.sl ?? 0,
    st: initialData?.st ?? 0,
    peso_por_paquete: initialData?.peso_por_paquete ?? 0,
    unidades_por_paquete: initialData?.unidades_por_paquete ?? 0,
    region_id: initialData?.region_id ?? 0,
    certificado_id: initialData?.certificado_id ?? 0,
  };

  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<MallaFormValues>({
    resolver: zodResolver(mallaSchema),
    defaultValues,
  });

  const certificadoId = useWatch({ control, name: "certificado_id" });
  const certificadoSeleccionado = certificados.find(
    (certificado) => certificado.id === certificadoId
  );

  useEffect(() => {
    let activo = true;

    const fetchCertificados = async () => {
      try {
        const response = await fetch(
          APP_ROUTES.api.mallas.certificados_opciones
        );

        if (!response.ok) {
          throw new Error("Error al consultar los certificados.");
        }

        const result = await response.json();
        if (activo) setCertificados(result.data || []);
      } catch (error) {
        console.error("Error al cargar los certificados:", error);
        if (activo) toast.error("No se pudieron cargar los certificados.");
      } finally {
        if (activo) setLoadingCertificados(false);
      }
    };

    fetchCertificados();

    return () => {
      activo = false;
    };
  }, []);

  const hasTab1Errors = Object.keys(errors).length > 0;

  const onError = () => {
    toast.error(
      "Hay errores en el formulario. Revisa los campos señalados antes de guardar."
    );
    setActiveTab(0);
  };

  const onSubmit = async (data: MallaFormValues) => {
    await onSubmitProp(data);
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit, onError)} noValidate>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span>1. Datos de la malla</span>
              {hasTab1Errors && <ErrorIcon color="error" fontSize="small" />}
            </Box>
          }
        />
        <Tab label="2. Certificado" />
      </Tabs>

      {activeTab === 0 && (
        <Stack spacing={2}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Identificación
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormTextField
                    name="codigo"
                    control={control}
                    label="Código"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormTextField
                    name="art_codigo"
                    control={control}
                    label="Código de ADM"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormTextField
                    name="designacion"
                    control={control}
                    label="Designación"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormTextField
                    name="art_concepto"
                    control={control}
                    label="Concepto"
                    required
                  />
                </Grid>
                <Grid
                  size={{ xs: 12 }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
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
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Dimensiones
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="diametro"
                    type="number"
                    control={control}
                    label="Diámetro (mm)"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="ancho"
                    type="number"
                    control={control}
                    label="Ancho (mm)"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="largo"
                    type="number"
                    control={control}
                    label="Largo (mm)"
                    required
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Retícula y salientes
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormTextField
                    name="longitudinales"
                    type="number"
                    control={control}
                    label="No. Longitudinales"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormTextField
                    name="transversales"
                    type="number"
                    control={control}
                    label="No. Transversales"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormTextField
                    name="sl"
                    type="number"
                    control={control}
                    label="Saliente Longitudinal (SL)"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormTextField
                    name="st"
                    type="number"
                    control={control}
                    label="Saliente Transversal (ST)"
                    required
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Empaque y región
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="peso_por_paquete"
                    type="number"
                    control={control}
                    label="Peso por paquete (kg)"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="unidades_por_paquete"
                    type="number"
                    control={control}
                    label="Unidades por paquete"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormSelect
                    name="region_id"
                    control={control}
                    label="Región"
                    required
                    options={regiones.map((region) => ({
                      id: region.id,
                      label: region.region,
                    }))}
                    loading={loadingRegiones}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )}

      {activeTab === 1 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Certificado asociado
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormSelect
                  name="certificado_id"
                  control={control}
                  label="Certificado"
                  options={[
                    { id: 0, label: "Sin certificado" },
                    ...certificados.map((certificado) => ({
                      id: certificado.id,
                      label: certificado.certificado,
                    })),
                  ]}
                  loading={loadingCertificados}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 3,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
                p: 2,
                borderRadius: 2,
                border: 1,
                borderStyle: "dashed",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              {loadingCertificados ? (
                <CircularProgress size={32} />
              ) : certificadoSeleccionado?.imagen ? (
                <Box
                  component="img"
                  src={APP_ROUTES.api.mallas.certificados_imagen(
                    certificadoSeleccionado.id
                  )}
                  alt={`Certificado ${certificadoSeleccionado.certificado}`}
                  sx={{
                    maxWidth: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    borderRadius: 1,
                  }}
                />
              ) : (
                <Stack
                  spacing={1}
                  sx={{ textAlign: "center", alignItems: "center" }}
                >
                  <VerifiedIcon color="disabled" sx={{ fontSize: 48 }} />
                  <Typography variant="body2" color="text.secondary">
                    {certificadoSeleccionado
                      ? "El certificado seleccionado no tiene una imagen asociada."
                      : "Selecciona un certificado para previsualizar su imagen."}
                  </Typography>
                </Stack>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

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
              ? "Actualizar Malla"
              : "Crear Malla"}
        </Button>
      </Box>
    </Box>
  );
}
