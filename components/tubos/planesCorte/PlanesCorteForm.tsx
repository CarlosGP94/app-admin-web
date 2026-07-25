"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useForm, useFieldArray, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Stack,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  TextField,
  Autocomplete,
  Alert,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import { planCorteSchema, PlanCorteFormValues } from "./PlanesCorteFormSchema";
import { FormTextField } from "@/components/commons/FormTextfield";
import { toast } from "react-toastify";
import { APP_ROUTES } from "@/config/routes";
import { useTubosModule } from "@/app/tubos/layout";
import { FormSelect } from "@/components/commons/FormSelect";

export interface OpcionFleje {
  id: number;
  concepto: string;
  peso_medio: number;
  ancho: number;
  calidad_id?: number | string;
}

interface PlanCorteFormProps {
  initialData?: Partial<PlanCorteFormValues>;
  isEditing?: boolean;
  onSubmit: (data: PlanCorteFormValues) => Promise<void> | void;
}

export default function PlanCorteForm({
  initialData,
  isEditing = false,
  onSubmit: onSubmitProp,
}: PlanCorteFormProps) {
  const [flejesDisponibles, setFlejesDisponibles] = useState<OpcionFleje[]>([]);
  const { calidades, loadingCalidades } = useTubosModule();
  const [loadingFlejes, setLoadingFlejes] = useState(false);

  // Estados locales para añadir un nuevo fleje
  const [flejeSeleccionado, setFlejeSeleccionado] =
    useState<OpcionFleje | null>(null);
  const [numFlejesAgregar, setNumFlejesAgregar] = useState<number>(1);
  const [pesoUnitAgregar, setPesoUnitAgregar] = useState<number>(0);

  const defaultValues: PlanCorteFormValues = {
    ancho_estipulado: 0,
    calidad_id: 0,
    flejes: [],
    ...initialData,
  };

  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<PlanCorteFormValues>({
    resolver: zodResolver(planCorteSchema),
    defaultValues,
  });

  const { fields, append, remove, move, update } = useFieldArray({
    control,
    name: "flejes",
  });

  const calidadIdSeleccionada = watch("calidad_id");
  const anchoEstipulado = watch("ancho_estipulado") || 0;
  const flejesForm = watch("flejes") || [];

  // Carga de catálogo de flejes filtrados desde backend según calidadId
  const loadFlejesDisponibles = async (calidadId?: number) => {
    if (!calidadId) {
      setFlejesDisponibles([]);
      return;
    }

    setLoadingFlejes(true);
    try {
      const url = new URL(
        APP_ROUTES.api.tubos.flejes_all,
        window.location.origin,
      );
      url.searchParams.append("calidad_id", String(calidadId));

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Error al consultar los flejes");
      const result = await response.json();
      setFlejesDisponibles(result.data || result);
    } catch (err) {
      console.error(err);
      toast.error("Error al cargar la lista de flejes");
    } finally {
      setLoadingFlejes(false);
    }
  };

  useEffect(() => {
    setFlejeSeleccionado(null);
    setPesoUnitAgregar(0);

    if (calidadIdSeleccionada) {
      void loadFlejesDisponibles(Number(calidadIdSeleccionada));
    } else {
      setFlejesDisponibles([]);
    }
  }, [calidadIdSeleccionada]);

  // Filtrado memoizado de flejes según la calidad elegida
  const flejesFiltrados = useMemo(() => {
    if (!calidadIdSeleccionada) return [];
    return flejesDisponibles.filter(
      (f) => !f.calidad_id || f.calidad_id === Number(calidadIdSeleccionada),
    );
  }, [flejesDisponibles, calidadIdSeleccionada]);

  // Mapa de búsqueda rápida de flejes por ID para obtener sus dimensiones
  const mapaFlejes = useMemo(() => {
    const map = new Map<number, OpcionFleje>();
    flejesDisponibles.forEach((f) => map.set(f.id, f));
    return map;
  }, [flejesDisponibles]);

  // Recalcular 'factor_proporcional_peso' de forma reactiva
  useEffect(() => {
    if (!anchoEstipulado || anchoEstipulado <= 0) return;

    flejesForm.forEach((item, index) => {
      const infoFleje = mapaFlejes.get(item.fleje_id);
      if (infoFleje) {
        const factorCalculado =
          (infoFleje.ancho * item.num_flejes) / anchoEstipulado;
        const factorRedondeado = Math.round(factorCalculado * 1000) / 1000;

        if (item.factor_proporcional_peso !== factorRedondeado) {
          setValue(
            `flejes.${index}.factor_proporcional_peso`,
            factorRedondeado,
            { shouldValidate: true },
          );
        }
      }
    });
  }, [anchoEstipulado, flejesForm, mapaFlejes, setValue]);

  // Cálculo acumulado del ancho total ocupado por los flejes agregados
  const anchoTotalUtilizado = useMemo(() => {
    return flejesForm.reduce((acc, curr) => {
      const info = mapaFlejes.get(curr.fleje_id);
      const anchoFleje = info?.ancho || 0;
      return acc + anchoFleje * (curr.num_flejes || 0);
    }, 0);
  }, [flejesForm, mapaFlejes]);

  const excedeAnchoEstipulado = anchoTotalUtilizado > anchoEstipulado;

  // Manejador al seleccionar una opción del Autocomplete
  const handleFlejeSelect = (fleje: OpcionFleje | null) => {
    setFlejeSeleccionado(fleje);
    if (fleje) {
      setPesoUnitAgregar(fleje.peso_medio || 0);
    } else {
      setPesoUnitAgregar(0);
    }
  };

  const reindexarOrden = () => {
    const flejesActuales = getValues("flejes");
    flejesActuales.forEach((_, idx) => {
      setValue(`flejes.${idx}.orden`, idx + 1, { shouldValidate: true });
    });
  };

  const handleMover = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return;
    move(from, to);
    setTimeout(reindexarOrden, 0);
  };

  // Agregar Fleje a la lista con comprobación estricta de parámetros y dimensiones
  const handleAgregarFleje = () => {
    if (!flejeSeleccionado) {
      toast.warning("Selecciona un fleje del catálogo primero.");
      return;
    }

    if (numFlejesAgregar <= 0) {
      toast.error("El número de flejes debe ser mayor a 0.");
      return;
    }

    if (pesoUnitAgregar <= 0) {
      toast.error("El peso unitario definido debe ser mayor a 0.");
      return;
    }

    if (!anchoEstipulado || anchoEstipulado <= 0) {
      toast.error("Debes definir un ancho estipulado mayor a 0 primero.");
      return;
    }

    const nuevoAnchoAcumulado =
      anchoTotalUtilizado + flejeSeleccionado.ancho * numFlejesAgregar;

    if (nuevoAnchoAcumulado > anchoEstipulado) {
      toast.error(
        `No se puede agregar: El ancho total resultante (${nuevoAnchoAcumulado} mm) supera el ancho estipulado (${anchoEstipulado} mm).`,
      );
      return;
    }

    const factor =
      (flejeSeleccionado.ancho * numFlejesAgregar) / anchoEstipulado;
    const factorRedondeado = Math.round(factor * 1000) / 1000;

    append({
      fleje_id: Number(flejeSeleccionado.id),
      num_flejes: Number(numFlejesAgregar),
      peso_unit_definido: Number(pesoUnitAgregar),
      factor_proporcional_peso: factorRedondeado,
      orden: fields.length + 1,
    });

    setFlejeSeleccionado(null);
    setNumFlejesAgregar(1);
    setPesoUnitAgregar(0);
  };

  const handleDividir = (index: number) => {
    const item = getValues(`flejes.${index}`);
    if (item.num_flejes <= 1) return;

    const cantidadRestante = item.num_flejes - 1;

    update(index, {
      ...item,
      num_flejes: 1,
    });

    append({
      ...item,
      num_flejes: cantidadRestante,
      orden: fields.length + 1,
    });

    setTimeout(reindexarOrden, 0);
  };

  const handleUnirConAnterior = (index: number) => {
    if (index === 0) return;
    const actual = getValues(`flejes.${index}`);
    const anterior = getValues(`flejes.${index - 1}`);

    if (actual.fleje_id !== anterior.fleje_id) {
      toast.warning("Solo se pueden unir flejes con el mismo ID.");
      return;
    }

    update(index - 1, {
      ...anterior,
      num_flejes: anterior.num_flejes + actual.num_flejes,
    });

    remove(index);
    setTimeout(reindexarOrden, 0);
  };

  const onSubmit = async (data: PlanCorteFormValues) => {
    if (excedeAnchoEstipulado) {
      toast.error(
        "El ancho total de los flejes no puede superar el ancho estipulado.",
      );
      return;
    }

    const tieneCamposInvalidos = data.flejes.some(
      (f) => f.peso_unit_definido <= 0 || f.num_flejes <= 0,
    );
    if (tieneCamposInvalidos) {
      toast.error(
        "Todos los flejes deben tener un Nº de flejes y Peso Unitario mayor a 0.",
      );
      return;
    }

    const dataConOrden = {
      ...data,
      flejes: data.flejes.map((f, i) => ({ ...f, orden: i + 1 })),
    };
    await onSubmitProp(dataConOrden);
  };

  const onError = (_formErrors: FieldErrors<PlanCorteFormValues>) => {
    toast.error(
      "Hay errores en el formulario. Revisa los campos requeridos antes de guardar.",
    );
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit, onError)} noValidate>
      <Stack spacing={3}>
        {/* ALERTAS GLOBALES DE DIMENSIÓN */}
        {excedeAnchoEstipulado && (
          <Alert severity="error">
            <strong>Error de dimensiones:</strong> La suma de los anchos de los
            flejes ({anchoTotalUtilizado} mm) supera el ancho estipulado (
            {anchoEstipulado} mm). Disminuye la cantidad de flejes o aumenta el
            ancho estipulado para poder guardar.
          </Alert>
        )}

        {/* CARD 1: CABECERA DEL PLAN DE CORTE */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Información del Plan de Corte
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormTextField
                  name="ancho_estipulado"
                  type="number"
                  control={control}
                  label="Ancho Estipulado (mm)"
                  required
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormSelect
                  name="calidad_id"
                  control={control}
                  label="Calidad del Acero"
                  loading={loadingCalidades}
                  disabled={flejesForm.length > 0}
                  required
                  options={calidades.map((c) => ({
                    id: Number(c.id),
                    label: c.nombre,
                  }))}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* CARD 2: FLEJES DEL PLAN DE CORTE */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Composición de Flejes
            </Typography>

            {/* SELECCIÓN Y CONTROLES DE ADICIÓN DE FLEJES */}
            <Grid container spacing={2} sx={{ mb: 3, alignItems: "center" }}>
              <Grid size={{ xs: 12, sm: 5 }}>
                <Autocomplete<
                  { id: number; label: string },
                  false,
                  false,
                  false
                >
                  options={flejesFiltrados.map((f) => ({
                    id: Number(f.id),
                    label: f.concepto,
                  }))}
                  value={
                    flejeSeleccionado
                      ? {
                          id: flejeSeleccionado.id,
                          label: flejeSeleccionado.concepto,
                        }
                      : null
                  }
                  loading={loadingFlejes}
                  disabled={loadingFlejes || !calidadIdSeleccionada}
                  size="small"
                  fullWidth
                  // 🔹 AÑADE ESTAS PROPIEDADES AQUI:
                  clearOnBlur={false}
                  blurOnSelect={true}
                  getOptionLabel={(option) =>
                    typeof option === "string" ? option : option.label
                  }
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <li key={option.id} {...optionProps}>
                        {option.label}
                      </li>
                    );
                  }}
                  onChange={(_, selected) => {
                    const original = flejesDisponibles.find(
                      (f) => f.id == selected?.id,
                    );
                    handleFlejeSelect(original || null);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Buscar y Seleccionar Fleje"
                      placeholder="Seleccionar..."
                    />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  label="Nº Flejes"
                  type="number"
                  size="small"
                  fullWidth
                  value={numFlejesAgregar}
                  slotProps={{ htmlInput: { min: 1 } }}
                  onChange={(e) =>
                    setNumFlejesAgregar(Math.max(1, Number(e.target.value)))
                  }
                />
              </Grid>

              <Grid size={{ xs: 6, sm: 2 }}>
                <TextField
                  label="Peso Unit. (kg)"
                  type="number"
                  size="small"
                  fullWidth
                  value={pesoUnitAgregar}
                  slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
                  onChange={(e) =>
                    setPesoUnitAgregar(Math.max(0, Number(e.target.value)))
                  }
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAgregarFleje}
                  disabled={!calidadIdSeleccionada || !flejeSeleccionado}
                  fullWidth
                  sx={{ textTransform: "none", height: 40 }}
                >
                  Agregar a la lista
                </Button>
              </Grid>
            </Grid>

            {/* RESUMEN DE COMPROBACIÓN DE ANCHOS */}
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 2,
                bgcolor: excedeAnchoEstipulado ? "error.light" : "action.hover",
                borderColor: excedeAnchoEstipulado ? "error.main" : "divider",
              }}
            >
              <Grid
                container
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Ancho acumulado ocupado: {anchoTotalUtilizado} mm
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Ancho estipulado límite: {anchoEstipulado} mm
                </Typography>
              </Grid>
            </Paper>

            <Divider sx={{ my: 2 }} />

            {/* LISTADO DINÁMICO DE FLEJES */}
            {fields.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                No se han agregado flejes al plan de corte.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {fields.map((fieldItem, index) => {
                  const flejeInfo = mapaFlejes.get(fieldItem.fleje_id);
                  const currentItem = flejesForm[index] || fieldItem;

                  const numFlejes = Number(currentItem.num_flejes) || 0;
                  const pesoUnit = Number(currentItem.peso_unit_definido) || 0;
                  const pesoTotalCalculado =
                    Math.round(numFlejes * pesoUnit * 100) / 100;

                  return (
                    <Paper
                      key={fieldItem.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: "background.default",
                      }}
                    >
                      <Grid container spacing={2} sx={{ alignItems: "center" }}>
                        {/* Posición */}
                        <Grid size={{ xs: 12, sm: 1 }}>
                          <Typography
                            variant="subtitle2"
                            align="center"
                            sx={{
                              bgcolor: "action.selected",
                              py: 1,
                              borderRadius: 1,
                              fontWeight: 700,
                            }}
                          >
                            #{index + 1}
                          </Typography>
                        </Grid>

                        {/* Nombre del Fleje */}
                        <Grid size={{ xs: 12, sm: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {flejeInfo?.concepto ||
                              `Fleje ID: ${fieldItem.fleje_id}`}
                          </Typography>
                          {flejeInfo?.ancho && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              Ancho: {flejeInfo.ancho} mm
                            </Typography>
                          )}
                        </Grid>

                        {/* Cantidad de Flejes */}
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <FormTextField
                            name={`flejes.${index}.num_flejes`}
                            type="number"
                            control={control}
                            label="Nº Flejes"
                            size="small"
                          />
                        </Grid>

                        {/* Peso Unitario Definido */}
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <FormTextField
                            name={`flejes.${index}.peso_unit_definido`}
                            type="number"
                            control={control}
                            label="Peso Unit."
                            size="small"
                          />
                        </Grid>

                        {/* Peso Total (Solo Lectura) */}
                        <Grid size={{ xs: 6, sm: 2 }}>
                          <TextField
                            label="Peso Total (kg)"
                            type="number"
                            size="small"
                            value={pesoTotalCalculado}
                            disabled
                            fullWidth
                            slotProps={{
                              input: {
                                readOnly: true,
                              },
                            }}
                          />
                        </Grid>

                        {/* Factor Proporcional (Calculado y Solo Lectura) */}
                        <Grid size={{ xs: 6, sm: 1.5 }}>
                          <FormTextField
                            name={`flejes.${index}.factor_proporcional_peso`}
                            type="number"
                            control={control}
                            label="Factor Prop."
                            size="small"
                            disabled
                          />
                        </Grid>

                        {/* Botones de acción */}
                        <Grid size={{ xs: 12, sm: 1.5 }}>
                          <Stack
                            sx={{
                              flexDirection: "row",
                              justifyContent: "flex-end",
                            }}
                            spacing={0.5}
                          >
                            <Tooltip title="Subir orden">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMover(index, index - 1)}
                                  disabled={index === 0}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Bajar orden">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleMover(index, index + 1)}
                                  disabled={index === fields.length - 1}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Dividir / Separar">
                              <span>
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleDividir(index)}
                                  disabled={
                                    getValues(`flejes.${index}.num_flejes`) <= 1
                                  }
                                >
                                  <CallSplitIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            {index > 0 && (
                              <Tooltip title="Unir con el anterior">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleUnirConAnterior(index)}
                                >
                                  <MergeTypeIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}

                            <Tooltip title="Eliminar">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  remove(index);
                                  setTimeout(reindexarOrden, 0);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* BOTÓN SUBMIT */}
      <Divider sx={{ my: 4 }} />
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          disabled={isSubmitting || excedeAnchoEstipulado}
          sx={{ minWidth: 180, textTransform: "none", fontWeight: 600 }}
        >
          {isSubmitting
            ? "Guardando..."
            : isEditing
              ? "Actualizar Plan de Corte"
              : "Crear Plan de Corte"}
        </Button>
      </Box>
    </Box>
  );
}
