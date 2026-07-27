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
  Chip,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Save,
  Straighten as StraightenIcon,
  CheckCircle,
  Warning,
  Edit,
  Error as ErrorIcon,
} from "@mui/icons-material";
import { toast } from "react-toastify";
import { useTubosModule } from "@/app/tubos/layout";
import { FormSelect } from "@/components/commons/FormSelect";
import { FormTextField } from "@/components/commons/FormTextfield";
import { MaquinaItem } from "@/lib/services/produccion.service";
import { APP_ROUTES } from "@/config/routes";
import { getFechaLocalISO } from "@/utils/functions";
import {
  ControlDimensionalFormValues,
  controlDimensionalSchema,
} from "./ControlDimensionalSchema";

// Interfaces
interface Tubo {
  id: number;
  tipo_id: number;
  medida?: string;
  alto?: number;
  ancho?: number;
  diametro?: number;
  espesor: number;
  longitud: number;
}

interface RecordToEdit {
  id?: number;
  maquina_id?: number;
  calidad_id?: number;
  tubo_id?: number;
  medida_de?: number;
  medida_va?: number;
  medida_hb?: number;
  medida_espesor?: number;
  medida_conv?: number;
  medida_rectang?: number;
  medida_redondeo?: number;
  medida_revirado_alt?: number;
  medida_revirado_base?: number;
  medida_rectitud?: number;
  medida_long?: number;
  creado?: string;
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

interface Tolerancia {
  nominal: number;
  min: number;
  max: number;
}

interface Tolerancias {
  [key: string]: Tolerancia;
}

type ControlDimensionalFieldName =
  | "id"
  | "maquina_id"
  | "calidad_id"
  | "tubo_id"
  | "medida_de"
  | "medida_va"
  | "medida_hb"
  | "medida_espesor"
  | "medida_conv"
  | "medida_rectang"
  | "medida_redondeo"
  | "medida_revirado_alt"
  | "medida_revirado_base"
  | "medida_rectitud"
  | "medida_long"
  | "fecha";

interface DimensionCardProps {
  key: string;
  name: ControlDimensionalFieldName;
  label: string;
  unit?: string;
  tolKey: string;
  isVisible?: boolean;
}

export default function ControlDimensionalForm({
  onSubmit: onSubmitProp,
  initialData = null,
}: {
  onSubmit: (data: ControlDimensionalFormValues) => Promise<void> | void;
  initialData?: RecordToEdit | null;
}) {
  const { maquinas, calidades } = useTubosModule();
  const [tubos, setTubos] = useState<Tubo[]>([]);
  const [loadingTubos, setLoadingTubos] = useState(false);
  const [tuboSeleccionado, setTuboSeleccionado] = useState<Tubo | null>(null);
  const [tolerancias, setTolerancias] = useState<Tolerancias>({});
  const [errorModal, setErrorModal] = useState<string | null>(null);

  const isEditing = Boolean(initialData && initialData.id);

  const methods = useForm({
    resolver: zodResolver(controlDimensionalSchema),
    defaultValues: {
      id: initialData?.id ? Number(initialData.id) : undefined,
      maquina_id: initialData?.maquina_id ? Number(initialData.maquina_id) : 0,
      calidad_id: initialData?.calidad_id ? Number(initialData.calidad_id) : 0,
      tubo_id: initialData?.tubo_id ? Number(initialData.tubo_id) : 0,
      medida_de: initialData?.medida_de ?? "",
      medida_va: initialData?.medida_va ?? "",
      medida_hb: initialData?.medida_hb ?? "",
      medida_espesor: initialData?.medida_espesor ?? "",
      medida_conv: initialData?.medida_conv ?? "",
      medida_rectang: initialData?.medida_rectang ?? "",
      medida_redondeo: initialData?.medida_redondeo ?? "",
      medida_revirado_alt: initialData?.medida_revirado_alt ?? "",
      medida_revirado_base: initialData?.medida_revirado_base ?? "",
      medida_rectitud: initialData?.medida_rectitud ?? "",
      medida_long: initialData?.medida_long ?? "",
      fecha: getFechaLocalISO(initialData?.creado),
    },
  });

  const { handleSubmit, watch, reset } = methods;

  const watchCalidadId = watch("calidad_id");
  const watchTuboId = watch("tubo_id");
  const watchMaquinaId = watch("maquina_id");

  // Determinar la geometría del tubo
  const esRedondo =
    tuboSeleccionado?.tipo_id == 3 || tuboSeleccionado?.tipo_id == 4;
  const esEstructural = (tuboSeleccionado?.espesor ?? 0) > 2 && !esRedondo;

  // Carga de Tubos al seleccionar Calidad
  useEffect(() => {
    const fetchTubos = async () => {
      if (!watchCalidadId) {
        setTubos([]);
        return;
      }
      try {
        setLoadingTubos(true);
        const url = new URL(
          APP_ROUTES.api.tubos.tubos_all,
          window.location.origin,
        );

        if (watchCalidadId)
          url.searchParams.append("calidad_id", watchCalidadId.toString());
        if (watchMaquinaId)
          url.searchParams.append("maquina_id", watchMaquinaId.toString());

        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Error al consultar los tubos");
        const result = await response.json();
        setTubos(result?.data || []);
      } catch (err) {
        console.error("Error al obtener el listado de tubos:", err);
        toast.error("Error al obtener el listado de tubos");
      } finally {
        setLoadingTubos(false);
      }
    };

    fetchTubos();
  }, [watchCalidadId]);

  // Obtención de Tubo Seleccionado y Carga de Tolerancias
  useEffect(() => {
    const cargarEspecificaciones = async () => {
      if (!watchTuboId || watchTuboId === 0) {
        setTuboSeleccionado(null);
        setTolerancias({});
        return;
      }
      try {
        const url = new URL(
          APP_ROUTES.api.tubos.tubos_detalle(watchTuboId.toString()),
          window.location.origin,
        );
        const response = await fetch(url.toString());
        const result = await response.json();

        const tubo = result;
        setTuboSeleccionado(tubo);
        if (tubo) {
          calcularTolerancias(tubo);
        }
      } catch (err) {
        console.error("Error al obtener tolerancias nominales:", err);
        toast.error("Error al obtener tolerancias nominales");
      }
    };

    cargarEspecificaciones();
  }, [watchTuboId]);

  // Precargar registro para Edición
  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id ? Number(initialData.id) : undefined,
        maquina_id: initialData.maquina_id ? Number(initialData.maquina_id) : 0,
        calidad_id: initialData.tubo?.calidad_id
          ? Number(initialData.tubo?.calidad_id)
          : 0,
        tubo_id: initialData.tubo_id ? Number(initialData.tubo_id) : 0,
        medida_de: initialData.medida_de,
        medida_va: initialData.medida_va,
        medida_hb: initialData.medida_hb,
        medida_espesor: initialData.medida_espesor,
        medida_conv: initialData.medida_conv,
        medida_rectang: initialData.medida_rectang,
        medida_redondeo: initialData.medida_redondeo,
        medida_revirado_alt: initialData.medida_revirado_alt,
        medida_revirado_base: initialData.medida_revirado_base,
        medida_rectitud: initialData.medida_rectitud,
        medida_long: initialData.medida_long,
        fecha: getFechaLocalISO(initialData?.creado),
      });
    }
  }, [initialData, reset]);

  // Algoritmo de cálculo de tolerancias según normativa de tubo
  const calcularTolerancias = (tubo: Tubo) => {
    const tols: Tolerancias = {};
    const esEst = tubo.espesor > 2;

    const dimensiones = ["alto", "ancho", "diametro"] as const;
    dimensiones.forEach((dim) => {
      const nominal = tubo[dim] || 0;
      const alto = tubo.alto || 0;
      if (
        (nominal > 0 && alto > 0 && dim !== "diametro") ||
        (nominal > 0 && alto === 0 && dim === "diametro")
      ) {
        let margen = 0;
        if (alto > 0) {
          if (esEst) {
            margen = nominal >= 100 ? nominal * 0.008 : nominal * 0.01;
          } else {
            if (nominal <= 20) margen = 0.2;
            else if (nominal <= 35) margen = 0.25;
            else if (nominal <= 50) margen = 0.3;
            else if (nominal <= 60) margen = 0.35;
            else if (nominal <= 70) margen = 0.4;
            else margen = 0.5;
          }
        } else {
          if (nominal <= 16) margen = 0.12;
          else if (nominal <= 30) margen = 0.15;
          else if (nominal <= 40) margen = 0.2;
          else if (nominal <= 50) margen = 0.25;
          else if (nominal <= 60) margen = 0.3;
          else margen = 0.5;
        }
        tols[dim] = { nominal, min: nominal - margen, max: nominal + margen };
      } else {
        tols[dim] = { nominal: 0, min: 0, max: 0 };
      }
    });

    const espNominal = tubo.espesor || 0;
    const margenEsp = espNominal > 5 ? 0.5 : espNominal * 0.1;
    tols["espesor"] = {
      nominal: espNominal,
      min: espNominal - margenEsp,
      max: espNominal + margenEsp,
    };

    const alto = tubo.alto || 0;
    const ancho = tubo.ancho || 0;

    tols["rectangularidad"] = {
      nominal: alto ? 90 : 0,
      min: alto ? 89 : 0,
      max: alto ? 91 : 0,
    };

    tols["concavidad"] = {
      nominal: 0,
      min: 0,
      max: alto ? alto * 0.08 : 0,
    };

    let redondeoMax = 0;
    let redondeoMin = 0;
    if (alto > 0) {
      if (tubo.espesor > 2) {
        redondeoMax = tubo.espesor * 2.4;
        redondeoMin = tubo.espesor * 1.6;
      } else {
        redondeoMax = tubo.espesor * 1.5;
        redondeoMin = 0;
      }
    }
    tols["redondeo"] = { nominal: 0, min: redondeoMin, max: redondeoMax };

    let reviradoAltMax = 0;
    if (alto > 0) {
      reviradoAltMax =
        tubo.espesor > 2
          ? 2 + (tubo.longitud * 0.5) / 100
          : alto <= 30
            ? 3
            : alto * 0.1;
    }
    tols["revirado_alt"] = { nominal: 0, min: 0, max: reviradoAltMax };

    const reviradoBaseMax = alto > 0 ? (ancho <= 30 ? 3 : ancho * 0.1) : 0;
    tols["revirado_base"] = { nominal: 0, min: 0, max: reviradoBaseMax };

    let maxrectitud = 0;
    if (tubo.espesor > 2) {
      maxrectitud = (tubo.longitud * 0.15) / 100;
    } else if (alto === 0) {
      maxrectitud = (tubo.longitud * 0.2) / 100;
    } else if (alto <= 30 && ancho <= 30) {
      maxrectitud = (tubo.longitud * 0.25) / 100;
    } else {
      maxrectitud = (tubo.longitud * 0.15) / 100;
    }
    tols["rectitud"] = { nominal: 0, min: 0, max: maxrectitud };

    const longSum = tubo.longitud ? (tubo.espesor > 2 ? 15 : 10) : 0;
    const lonNominal = tubo.longitud || 0;
    tols["longitud"] = {
      nominal: lonNominal,
      min: lonNominal,
      max: lonNominal + longSum,
    };

    setTolerancias(tols);
  };

  const onSubmit = async (data: ControlDimensionalFormValues) => {
    if (!tuboSeleccionado) {
      setErrorModal("Debe seleccionar un tubo válido.");
      return;
    }

    // Validaciones básicas de campos obligatorios
    if (!data.medida_espesor || !data.medida_rectitud || !data.medida_long) {
      setErrorModal(
        "Los campos de Espesor, Rectitud y Longitud son obligatorios.",
      );
      return;
    }

    if (esRedondo && !data.medida_de) {
      setErrorModal("El Diámetro Exterior es obligatorio para tubos redondos.");
      return;
    }

    if (!esRedondo) {
      if (
        !data.medida_va ||
        !data.medida_hb ||
        !data.medida_rectang ||
        !data.medida_redondeo
      ) {
        setErrorModal(
          "Complete los valores de Altura, Base, Rectangularidad y Redondeo.",
        );
        return;
      }
      if (esEstructural && !data.medida_conv) {
        setErrorModal(
          "La Concavidad/Convexidad es obligatoria en tubos estructurales.",
        );
        return;
      }
    }

    const payload = {
      ...(data.id ? { id: data.id } : {}),
      fecha: data.fecha ?? new Date().toISOString().split("T")[0],
      maquina_id: data.maquina_id,
      calidad_id: data.calidad_id,
      tubo_id: data.tubo_id,
      medida_de: Number(data.medida_de || 0),
      medida_va: Number(data.medida_va || 0),
      medida_hb: Number(data.medida_hb || 0),
      medida_espesor: Number(data.medida_espesor || 0),
      medida_conv: Number(data.medida_conv || 0),
      medida_rectang: Number(data.medida_rectang || 0),
      medida_redondeo: Number(data.medida_redondeo || 0),
      medida_revirado_alt: Number(data.medida_revirado_alt || 0),
      medida_revirado_base: Number(data.medida_revirado_base || 0),
      medida_rectitud: Number(data.medida_rectitud || 0),
      medida_long: Number(data.medida_long || 0),
    };
    await onSubmitProp(payload);
  };

  // Subcomponente de Renderizado de Cota Dimensional Individual
  const renderDimensionCard = ({
    key,
    name,
    label,
    unit = "mm",
    tolKey,
    isVisible = true,
  }: DimensionCardProps) => {
    if (!isVisible) return null;

    const valMedido = watch(name);
    const tol = tolerancias[tolKey] || { nominal: "-", min: "-", max: "-" };
    const numVal = Number(valMedido);

    const hasValue =
      valMedido !== "" && valMedido !== undefined && valMedido !== null;
    const isOutOfRange =
      hasValue &&
      typeof tol.min === "number" &&
      typeof tol.max === "number" &&
      (numVal < tol.min || numVal > tol.max);

    const isOk = hasValue && !isOutOfRange;

    return (
      <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={name}>
        <Card
          variant="outlined"
          sx={{
            borderRadius: 2,
            transition: "all 0.2s ease-in-out",
            borderColor: isOutOfRange
              ? "error.main"
              : isOk
                ? "success.main"
                : "divider",
            boxShadow: isOutOfRange
              ? "0 0 8px rgba(213, 0, 0, 0.2)"
              : "0 2px 4px rgba(0,0,0,0.02)",
            bgcolor: isOutOfRange
              ? "#fff8f8"
              : isOk
                ? "#f6fff8"
                : "background.paper",
          }}
        >
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            {/* Header Cota */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography
                sx={{ fontWeight: "bold", color: "text.primary" }}
                variant="subtitle2"
              >
                {label} ({unit})
              </Typography>
              {hasValue && (
                <Chip
                  size="small"
                  icon={
                    isOutOfRange ? (
                      <Warning fontSize="small" />
                    ) : (
                      <CheckCircle fontSize="small" />
                    )
                  }
                  label={isOutOfRange ? "Fora Tol." : "OK"}
                  color={isOutOfRange ? "error" : "success"}
                  sx={{ height: 22, fontSize: "0.7rem", fontWeight: "bold" }}
                />
              )}
            </Box>

            {/* Ilustración + Datos Nominales */}
            <Grid
              container
              spacing={1}
              sx={{ alignItems: "center", mb: 1.5, alignContent: "center" }}
            >
              <Grid size={{ xs: 5 }}>
                <Box
                  sx={{
                    height: 65,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 0.5,
                    borderRadius: 1,
                    bgcolor: "#fafafa",
                    border: "1px dashed #e0e0e0",
                  }}
                >
                  <StraightenIcon color="disabled" />
                </Box>
              </Grid>

              <Grid size={{ xs: 7 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    bgcolor: "#f8f9fa",
                    border: "1px solid #edf2f7",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    Nominal:{" "}
                    <strong>
                      {typeof tol.nominal === "number"
                        ? tol.nominal.toFixed(1)
                        : tol.nominal}
                    </strong>
                  </Typography>
                  <Typography
                    variant="caption"
                    color="success.main"
                    sx={{ fontSize: "10px", display: "block" }}
                  >
                    Mín:{" "}
                    {typeof tol.min === "number" ? tol.min.toFixed(2) : tol.min}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="error.main"
                    sx={{
                      fontSize: "10px",
                      display: "block",
                    }}
                  >
                    Máx:{" "}
                    {typeof tol.max === "number" ? tol.max.toFixed(2) : tol.max}
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Input Medida Real */}
            <FormTextField
              control={methods.control}
              size="small"
              name={name}
              label="Valor Medido"
              type="number"
              fullWidth
              error={isOutOfRange}
            />
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <FormProvider {...methods}>
      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        {/* SECCIÓN 1: SELECCIÓN DE PARÁMETROS Y FECHA */}
        <Card elevation={0} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Selección de Proceso y Producto
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormTextField
                  control={methods.control}
                  size="small"
                  name="fecha"
                  type="date"
                  label="Fecha Registro"
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  control={methods.control}
                  size="small"
                  name="maquina_id"
                  disabled
                  label="Máquina / Línea de Producción"
                  options={maquinas.map((m: MaquinaItem) => ({
                    id: Number(m.id),
                    label: m.maquina,
                  }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  control={methods.control}
                  size="small"
                  name="calidad_id"
                  disabled
                  label="Calidad de Acero"
                  options={calidades.map((c) => ({
                    id: Number(c.id),
                    label: c.nombre,
                  }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormSelect
                  size="small"
                  control={methods.control}
                  name="tubo_id"
                  label="Tubo Especificado"
                  loading={loadingTubos}
                  disabled
                  options={tubos.map((t) => ({
                    id: Number(t.id),
                    label: t.medida || `Tubo #${t.id}`,
                  }))}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* SECCIÓN 2: MEDIDAS Y CONTROL DIMENSIONAL */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Stack
              direction="row"
              sx={{
                mb: 2,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Medición Real y Verificación de Tolerancias
              </Typography>

              {tuboSeleccionado && (
                <Chip
                  label={`Tipo: ${
                    esRedondo
                      ? "Redondo"
                      : esEstructural
                        ? "Estructural"
                        : "Perfil Normal"
                  }`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>

            {!tuboSeleccionado ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Seleccione una máquina, calidad y tubo para desplegar la
                plantilla de control dimensional correspondiente.
              </Alert>
            ) : (
              <Grid container spacing={2}>
                {/* COTA DIÁMETRO (Sólo para redondos) */}
                {renderDimensionCard({
                  key: "diametro",
                  name: "medida_de",
                  label: "Diámetro Exterior",
                  tolKey: "diametro",
                  isVisible: esRedondo,
                })}

                {/* COTA ALTURA */}
                {renderDimensionCard({
                  key: "alto",
                  name: "medida_va",
                  label: "Altura (H)",
                  tolKey: "alto",
                  isVisible: !esRedondo,
                })}

                {/* COTA BASE */}
                {renderDimensionCard({
                  key: "ancho",
                  name: "medida_hb",
                  label: "Base (B)",
                  tolKey: "ancho",
                  isVisible: !esRedondo,
                })}

                {/* COTA ESPESOR */}
                {renderDimensionCard({
                  key: "espesor",
                  name: "medida_espesor",
                  label: "Espesor (T)",
                  tolKey: "espesor",
                  isVisible: true,
                })}

                {/* COTA CONCAVIDAD / CONVEXIDAD */}
                {renderDimensionCard({
                  key: "concavidad",
                  name: "medida_conv",
                  label: "Concavidad / Conv.",
                  tolKey: "concavidad",
                  isVisible: esEstructural,
                })}

                {/* COTA RECTANGULARIDAD */}
                {renderDimensionCard({
                  key: "rectangularidad",
                  name: "medida_rectang",
                  label: "Rectangularidad",
                  unit: "°",
                  tolKey: "rectangularidad",
                  isVisible: !esRedondo,
                })}

                {/* COTA REDONDEO */}
                {renderDimensionCard({
                  key: "redondeo",
                  name: "medida_redondeo",
                  label: "Redondeo Esquinas",
                  tolKey: "redondeo",
                  isVisible: !esRedondo,
                })}

                {/* COTA REVIRADO ALTURA */}
                {renderDimensionCard({
                  key: "revirado_alt",
                  name: "medida_revirado_alt",
                  label: "Revirado Altura",
                  tolKey: "revirado_alt",
                  isVisible: !esRedondo,
                })}

                {/* COTA REVIRADO BASE */}
                {renderDimensionCard({
                  key: "revirado_base",
                  name: "medida_revirado_base",
                  label: "Revirado Base",
                  tolKey: "revirado_base",
                  isVisible: !esRedondo,
                })}

                {/* COTA RECTITUD */}
                {renderDimensionCard({
                  key: "rectitud",
                  name: "medida_rectitud",
                  label: "Rectitud Global",
                  tolKey: "rectitud",
                  isVisible: true,
                })}

                {/* COTA LONGITUD */}
                {renderDimensionCard({
                  key: "longitud",
                  name: "medida_long",
                  label: "Longitud Cortada",
                  tolKey: "longitud",
                  isVisible: true,
                })}
              </Grid>
            )}

            {/* BOTÓN DE ACCIÓN */}
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
                disabled={!tuboSeleccionado}
                startIcon={isEditing ? <Edit /> : <Save />}
                sx={{ px: 4, borderRadius: 2 }}
              >
                {isEditing
                  ? "Actualizar Registro"
                  : "Guardar Control Dimensional"}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* MODAL DE ERROR / VALIDACIÓN */}
        <Dialog
          open={Boolean(errorModal)}
          onClose={() => setErrorModal(null)}
          slotProps={{
            paper: {
              sx: { borderRadius: 2, p: 1, maxWidth: 450 },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "error.main",
              fontWeight: "bold",
            }}
          >
            <ErrorIcon color="error" />
            Campos Incompletos
          </DialogTitle>
          <DialogContent>
            <DialogContentText color="text.primary">
              {errorModal}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setErrorModal(null)}
              variant="contained"
              color="primary"
              autoFocus
              sx={{ borderRadius: 1.5 }}
            >
              Entendido
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </FormProvider>
  );
}
