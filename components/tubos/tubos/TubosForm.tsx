// @/components/tubos/TuboForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Checkbox,
  Button,
  Tabs,
  Tab,
  Autocomplete,
  Stack,
  Divider,
  Chip,
  CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { tuboSchema, TuboFormValues } from "./TuboFormSchema";
import { useTubosModule } from "@/app/tubos/layout";
import { FormSelect } from "@/components/commons/FormSelect";
import { FormTextField } from "@/components/commons/FormTextfield";
import { APP_ROUTES } from "@/config/routes";
import { FormAutocompleteMultiple } from "@/components/commons/FormAutocompleteMultiple";

interface TuboFormProps {
  initialData?: Partial<TuboFormValues>;
  isEditing?: boolean;
  onSubmit: (data: TuboFormValues) => Promise<void> | void;
}

function formatearConceptoTubo(
  medidaPlantilla: string,
  altoTxt: string,
  anchoTxt: string,
  diametroTxt: string,
  espesorTxt: string,
): string {
  if (diametroTxt) {
    return `${diametroTxt}x${espesorTxt}`;
  }
  if (altoTxt && anchoTxt) {
    return `${altoTxt}x${anchoTxt}x${espesorTxt}`;
  }
  if (anchoTxt) {
    return `${anchoTxt}x${anchoTxt}x${espesorTxt}`;
  }
  return medidaPlantilla || "";
}

export default function TuboForm({
  initialData,
  isEditing = false,
  onSubmit: onSubmitProp,
}: TuboFormProps) {
  // Contextos
  const {
    calidades,
    loadingCalidades,
    tipos,
    loadingTipos,
    maquinas,
    loadingMaquinas,
  } = useTubosModule();

  const [activeTab, setActiveTab] = useState(0);
  const [flejeGlobal, setFlejeGlobal] = useState<number[]>([]);
  const [flejesDisponibles, setFlejesDisponibles] = useState<
    { id: number; concepto: string }[]
  >([]);
  const [loadingFlejes, setLoadingFlejes] = useState(true);

  const defaultValues: TuboFormValues = {
    art_concepto: "",
    calidad_id: 0,
    tipo_id: 0,
    no_especial: undefined,
    activo: true,
    alto: 0,
    ancho: 0,
    diametro: 0,
    espesor: 0,
    longitud: 0,
    num_paquetes: 0,
    num_por_paq: 0,
    unidades: 0,
    peso_unitario: 0,
    peso_total: 10,
    masa_lineal: 0,
    alto_paq: 0,
    ancho_paq: 0,
    maquinasConfig: [],
    ...initialData,
  };

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<TuboFormValues>({
    resolver: zodResolver(tuboSchema),
    defaultValues,
  });

  // 1. Extraemos 'replace' para reemplazar el array de campos dinámicamente
  const { fields: maquinasFields, replace } = useFieldArray({
    control,
    name: "maquinasConfig",
  });

  // 2. EFECTO CLAVE: Poblar maquinasConfig con las máquinas obtenidas del contexto
  useEffect(() => {
    if (!maquinas || maquinas.length === 0) return;

    const initialConfigs = initialData?.maquinasConfig || [];

    const configMapeada = maquinas.map((m) => {
      const configExistente = initialConfigs.find(
        (ic) => ic.maquina_id == Number(m.id),
      );

      return {
        maquina_id: Number(m.id),
        maquina_nombre: m.maquina,
        habilitada: configExistente ? configExistente.habilitada : false,
        flejes_ids: configExistente ? configExistente.flejes_ids : [],
      };
    });

    replace(configMapeada);
  }, [maquinas, initialData, replace]);

  // Observadores de cambios para automatizar cálculos
  const artConcepto = watch("art_concepto");
  const tipoId = watch("tipo_id");
  const calidadId = watch("calidad_id");
  const noEspecial = watch("no_especial");
  const numPaquetes = watch("num_paquetes");
  const numPorPaq = watch("num_por_paq");
  const pesoUnitario = watch("peso_unitario");
  const pesoTotal = watch("peso_total");
  const masaLineal = watch("masa_lineal");
  const longitud = watch("longitud");
  const alto = watch("alto");
  const ancho = watch("ancho");
  const diametro = watch("diametro");
  const espesor = watch("espesor");
  const unidades = watch("unidades");

  // Tipo 2 (Cuadrado) -> Copiar Ancho a Alto automáticamente
  useEffect(() => {
    if (tipoId === 1 && ancho !== undefined) {
      setValue("alto", ancho, { shouldValidate: true });
    }
  }, [tipoId, ancho, setValue]);

  // Construir Denominación Comercial
  useEffect(() => {
    const calidadObj = calidades.find((c) => c.id === calidadId);
    const tipoObj = tipos.find((t) => t.id === tipoId);

    const calidad = calidadObj ? calidadObj.label_tubo : "";
    const tipo = tipoObj ? tipoObj.prefijo : "";

    const altoTxt = alto ? String(alto) : "";
    const anchoTxt = ancho ? String(ancho) : "";
    const diametroTxt = diametro ? String(diametro) : "";
    const espesorTxt = espesor ? String(espesor) : "";
    const longitudTxt = longitud ? String(longitud) : "";

    let base = "";
    if (tipoId == 4) {
      base =
        noEspecial !== undefined && noEspecial !== null
          ? String(noEspecial)
          : "";
    } else {
      base = formatearConceptoTubo(
        "",
        altoTxt,
        anchoTxt,
        diametroTxt,
        espesorTxt,
      );
    }

    let medida = `${calidad ? `${calidad.toUpperCase()} ` : ""}${
      tipo ? `${tipo.toUpperCase()} ` : ""
    }${base}`.trim();

    const numLongitud = Number(longitud);
    if (numLongitud > 0) {
      medida = `${medida} L${longitudTxt}m`;
    }

    setValue("art_concepto", medida, { shouldValidate: true });
  }, [
    calidadId,
    tipoId,
    noEspecial,
    alto,
    ancho,
    diametro,
    espesor,
    longitud,
    tipos,
    calidades,
    setValue,
  ]);

  useEffect(() => {
    const pu = Number(pesoUnitario) || 0;
    const l = Number(longitud) || 0;

    if (l > 0 && pu > 0) {
      const ml = pu / l;
      setValue("masa_lineal", Number(ml.toFixed(3)), { shouldValidate: true });
    } else {
      setValue("masa_lineal", 0, { shouldValidate: true });
    }
  }, [pesoUnitario, longitud, setValue]);

  // Recalcular Peso Total cuando cambian paquetes o peso unitario
  useEffect(() => {
    const unidadesTotales = (numPaquetes || 0) * (numPorPaq || 0);
    const calculadoTotal = unidadesTotales * (pesoUnitario || 0);
    setValue("unidades", unidadesTotales, { shouldValidate: true });
    setValue("peso_total", Math.max(1, Number(calculadoTotal.toFixed(2))), {
      shouldValidate: true,
    });
  }, [numPaquetes, numPorPaq, pesoUnitario, setValue]);

  // Cargar flejes
  const loadFlejesDisponibles = async () => {
    setLoadingFlejes(true);
    try {
      const url = new URL(
        APP_ROUTES.api.tubos.flejes_all,
        window.location.origin,
      );
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Error al consultar los flejes");
      const result = await response.json();
      setFlejesDisponibles(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFlejes(false);
    }
  };

  useEffect(() => {
    loadFlejesDisponibles();
  }, []);

  const handleAplicarFlejesGlobales = () => {
    maquinasFields.forEach((_, index) => {
      setValue(`maquinasConfig.${index}.flejes_ids`, flejeGlobal, {
        shouldValidate: true,
      });
    });
  };

  const onSubmit = async (data: TuboFormValues) => {
    await onSubmitProp(data);
  };
  const renderDimensionesTexto = () => {
    if (tipoId === 3)
      return `Diámetro: ${diametro || 0}mm | Espesor: ${espesor || 0}mm`;
    if (tipoId === 4)
      return `No. Especial: ${noEspecial || "-"} | Espesor: ${espesor || 0}mm`;
    return `Alto: ${alto || 0}mm | Ancho: ${ancho || 0}mm | Espesor: ${espesor || 0}mm`;
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* NAVEGACIÓN TAB */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label="1. Especificaciones y Pesos" />
        <Tab label="2. Máquinas y Flejes" />
      </Tabs>

      {/* ==================== TAB 1 ==================== */}
      {activeTab === 0 && (
        <Stack spacing={2}>
          {/* CARACTERÍSTICAS BÁSICAS */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Información Básica
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 9 }}>
                  <FormTextField
                    disabled
                    name="art_concepto"
                    control={control}
                    label="Medida / Denominación Comercial"
                    required
                  />
                </Grid>
                <Grid
                  size={{ xs: 12, sm: 3 }}
                  sx={{
                    display: "flex",
                    alignItems: "start",
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
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormSelect
                    name="calidad_id"
                    control={control}
                    label="Calidad"
                    required
                    options={calidades.map((c) => ({
                      id: Number(c.id),
                      label: c.nombre,
                    }))}
                    loading={loadingCalidades}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormSelect
                    name="tipo_id"
                    control={control}
                    label="Tipo de Tubo"
                    required
                    options={tipos.map((t) => ({
                      id: Number(t.id),
                      label: t.nombre,
                    }))}
                    loading={loadingTipos}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* DIMENSIONES PERFIL */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Dimensiones Perfil
              </Typography>
              <Grid container spacing={2}>
                {tipoId == 4 && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormTextField
                      name="no_especial"
                      type="number"
                      control={control}
                      label="No. Especial"
                      required
                    />
                  </Grid>
                )}

                {(tipoId === 1 || tipoId === 2) && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormTextField
                      name="ancho"
                      type="number"
                      control={control}
                      label={tipoId === 1 ? "Lado / Ancho (mm)" : "Ancho (mm)"}
                    />
                  </Grid>
                )}

                {tipoId === 2 && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormTextField
                      name="alto"
                      type="number"
                      control={control}
                      label="Alto (mm)"
                    />
                  </Grid>
                )}

                {tipoId === 3 && (
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormTextField
                      name="diametro"
                      type="number"
                      control={control}
                      label="Diámetro (mm)"
                    />
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormTextField
                    name="espesor"
                    type="number"
                    control={control}
                    label="Espesor (mm)"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 3 }}>
                  <FormTextField
                    name="longitud"
                    type="number"
                    control={control}
                    label="Longitud (m)"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* INVENTARIO Y PAQUETES */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Empaquetado e Inventario
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="num_por_paq"
                    type="number"
                    control={control}
                    label="Piezas por Paquete"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    disabled={numPorPaq == 0}
                    name="num_paquetes"
                    type="number"
                    control={control}
                    label="Nº Paquetes"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="unidades"
                    type="number"
                    control={control}
                    label="Unidades"
                    disabled
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* PESOS Y VOLUMEN */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Magnitudes de Peso y Paquete
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="peso_unitario"
                    type="number"
                    control={control}
                    label="Peso Unitario (kg)"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    disabled
                    name="masa_lineal"
                    type="number"
                    control={control}
                    label="Masa Lineal (kg/m)"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormTextField
                    name="peso_total"
                    type="number"
                    control={control}
                    label="Peso Total (kg)"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormTextField
                    name="alto_paq"
                    type="number"
                    control={control}
                    label="Alto Paquete (mm)"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormTextField
                    name="ancho_paq"
                    type="number"
                    control={control}
                    label="Ancho Paquete (mm)"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* ==================== TAB 2: MÁQUINAS Y FLEJES ==================== */}
      {activeTab === 1 && (
        <Stack spacing={3}>
          {/* TARJETA RESUMEN */}
          <Card
            variant="outlined"
            sx={{
              p: 0,
              borderRadius: 2,
              borderColor: "primary.light",
              bgcolor: "primary.50",
            }}
          >
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {artConcepto || "Sin especificar"}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 9 }}>
                  <Stack
                    sx={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 1,
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Dimensiones: ${renderDimensionesTexto()}`}
                    />
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Longitud: ${longitud || 0}m`}
                    />
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Masa Lineal: ${masaLineal || 0} kg/m`}
                    />
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      label={`Total: ${unidades || 0} uds (${pesoTotal || 0} kg)`}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* ASIGNACIÓN MASIVA */}
          <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "grey.50" }}>
            <CardContent>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600 }}
                gutterBottom
              >
                Asignación Masiva de Flejes
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={flejesDisponibles.map((f) => ({
                      id: Number(f.id),
                      label: f.concepto,
                    }))}
                    getOptionLabel={(option) => option.label}
                    isOptionEqualToValue={(option, value) =>
                      option.id === value.id
                    }
                    value={flejesDisponibles
                      .map((f) => ({
                        id: Number(f.id),
                        label: f.concepto,
                      }))
                      .filter((f) => flejeGlobal.includes(f.id))}
                    onChange={(_, selected) =>
                      setFlejeGlobal(selected.map((s) => s.id))
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seleccionar flejes para todas las máquinas"
                      />
                    )}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      return (
                        <li key={`option-${option.id}`} {...optionProps}>
                          {option.label}
                        </li>
                      );
                    }}
                    renderValue={(selected, getItemProps) =>
                      selected.map((option, index) => {
                        const { key, ...itemProps } = getItemProps({ index });
                        return (
                          <Chip
                            key={`chip-${option.id}-${index}`}
                            label={option.label}
                            {...itemProps}
                          />
                        );
                      })
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleAplicarFlejesGlobales}
                    disabled={loadingFlejes || flejeGlobal.length === 0}
                  >
                    Aplicar a Todas
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* MÁQUINAS Y SUS FLEJES */}
          {loadingMaquinas ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : maquinasFields.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center">
              No hay máquinas disponibles en la configuración.
            </Typography>
          ) : (
            maquinasFields.map((item, index) => (
              <Card key={item.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Controller
                        name={`maquinasConfig.${index}.habilitada`}
                        control={control}
                        render={({ field }) => (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={field.value}
                                onChange={(e) =>
                                  field.onChange(e.target.checked)
                                }
                              />
                            }
                            label={
                              <Typography sx={{ fontWeight: 600 }}>
                                {item.maquina_nombre}
                              </Typography>
                            }
                          />
                        )}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 8 }}>
                      <FormAutocompleteMultiple
                        name={`maquinasConfig.${index}.flejes_ids`}
                        control={control}
                        label="Flejes Asignados"
                        placeholder="Añadir fleje..."
                        options={flejesDisponibles.map((f) => ({
                          id: Number(f.id),
                          label: f.concepto,
                        }))}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

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
              ? "Actualizar Tubo"
              : "Crear Tubo"}
        </Button>
      </Box>
    </Box>
  );
}
