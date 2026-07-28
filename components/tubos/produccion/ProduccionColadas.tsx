"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Autocomplete,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import {
  Layers as LayersIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Memory as CpuIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  PrecisionManufacturing as PrecisionManufacturingIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { APP_ROUTES } from "@/config/routes";

// --- TIPOS ---
export interface BobinaOpcion {
  id: number;
  coladaId: number;
  coladaNombre: string;
  codigo: string;
  proveedor?: string;
}

export interface ColadaOpcion {
  id: number;
  nombre: string;
}

type ColadaAutocompleteOption = ColadaOpcion & {
  inputValue?: string;
};

export interface FlejeDetalle {
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

export interface ProduccionConFlejes {
  id: number;
  lote: string;
  lote_tubo_id: number;
  tubo: string;
  tubo_id: number;
  maquina: string;
  fecha: string;
  flejes: FlejeDetalle[];
}

interface ComponentProps {
  producciones: ProduccionConFlejes[];
  bobinasDisponibles: BobinaOpcion[];
  onGuardarAsignacion: (
    flejesIds: number[],
    bobinaId: string | number | null | undefined,
    coladaNombreOId: string | number,
  ) => Promise<void>;
}

export default function TablaAuditoriaProducciones({
  producciones,
  bobinasDisponibles,
  onGuardarAsignacion,
}: ComponentProps) {
  // --- ESTADOS ---
  const [flejesSeleccionados, setFlejesSeleccionados] = useState<number[]>([]);
  const [bobinaSeleccionada, setBobinaSeleccionada] =
    useState<BobinaOpcion | null>(null);

  // Coladas dinámicas cargadas internamente
  const [coladasCargadas, setColadasCargadas] = useState<ColadaOpcion[]>([]);
  const [loadingColadas, setLoadingColadas] = useState(false);

  // Modo de edición para Colada (False = Selección desde lista / True = Entrada manual)
  const [esColadaManual, setEsColadaManual] = useState(false);

  const [coladaSeleccionada, setColadaSeleccionada] = useState<
    ColadaOpcion | string | null
  >(null);

  const [isPending, startTransition] = useTransition();

  // Coladas de fallback derivadas localmente de las bobinas
  const coladasFallback = useMemo<ColadaOpcion[]>(() => {
    const map = new Map<number, ColadaOpcion>();
    bobinasDisponibles.forEach((b) => {
      if (!map.has(b.coladaId)) {
        map.set(b.coladaId, { id: b.coladaId, nombre: b.coladaNombre });
      }
    });
    return Array.from(map.values());
  }, [bobinasDisponibles]);

  // Lista activa de coladas según la carga
  const coladasDisponibles = coladasCargadas.length
    ? coladasCargadas
    : coladasFallback;

  const filter = createFilterOptions<ColadaAutocompleteOption | string>();

  // --- FUNCIÓN INTERNA PARA OBTENER COLADAS POR BOBINA ---
  const fetchColadasInterno = async (
    bobinaId: number | string,
  ): Promise<ColadaOpcion[]> => {
    // Sustituye esta URL por tu endpoint o Server Action de Next.js
    const response = await fetch(
      APP_ROUTES.api.tubos.bobinas_coladas_bobina(String(bobinaId)),
    );
    if (!response.ok) {
      throw new Error("Error al obtener las coladas de la API");
    }
    return await response.json();
  };

  // --- HANDLER: SELECCIÓN DE BOBINA Y BÚSQUEDA INTERNA ---
  const handleSelectBobina = async (bobina: BobinaOpcion | null) => {
    setBobinaSeleccionada(bobina);

    if (!bobina) {
      setColadasCargadas([]);
      setColadaSeleccionada(null);
      return;
    }

    setLoadingColadas(true);
    try {
      // Búsqueda realizada internamente
      const coladas = await fetchColadasInterno(bobina.id);
      setColadasCargadas(coladas);

      if (coladas.length > 0) {
        setColadaSeleccionada(coladas[0]);
      } else {
        setColadaSeleccionada(null);
      }
    } catch (error) {
      console.error("Error al buscar coladas para la bobina:", error);

      // Fallback local con la colada vinculada a la bobina
      const coladaAsociada = coladasFallback.find(
        (c) => c.id === bobina.coladaId,
      ) || {
        id: bobina.coladaId,
        nombre: bobina.coladaNombre,
      };
      setColadasCargadas([coladaAsociada]);
      setColadaSeleccionada(coladaAsociada);
    } finally {
      setLoadingColadas(false);
    }
  };

  const handleSelectColada = (newValue: ColadaOpcion | string | null) => {
    setColadaSeleccionada(newValue);

    if (!newValue) return;

    // Si se selecciona un objeto del desplegable
    if (typeof newValue !== "string") {
      if (!bobinaSeleccionada || bobinaSeleccionada.coladaId !== newValue.id) {
        const primeraBobina = bobinasDisponibles.find(
          (b) => b.coladaId === newValue.id,
        );
        if (primeraBobina) setBobinaSeleccionada(primeraBobina);
      }
    }
  };

  const toggleModoManual = () => {
    setEsColadaManual((prev) => !prev);
  };

  // --- CHECKBOXES ---
  const toggleFleje = (flejeId: number) => {
    setFlejesSeleccionados((prev) =>
      prev.includes(flejeId)
        ? prev.filter((id) => id !== flejeId)
        : [...prev, flejeId],
    );
  };

  const toggleTodosLosFlejes = () => {
    const todos = producciones.flatMap((p) => p.flejes.map((f) => f.id));
    setFlejesSeleccionados(
      flejesSeleccionados.length === todos.length ? [] : todos,
    );
  };

  // --- SUBMIT ---
  const handleAplicar = () => {
    if (!coladaSeleccionada || flejesSeleccionados.length === 0) return;

    const coladaValor =
      typeof coladaSeleccionada === "string"
        ? coladaSeleccionada
        : coladaSeleccionada.id;

    const bobinaId = bobinaSeleccionada ? bobinaSeleccionada.id : null;

    startTransition(async () => {
      try {
        await onGuardarAsignacion(flejesSeleccionados, bobinaId, coladaValor);
        setFlejesSeleccionados([]);
      } catch (error) {
        console.error("Error al actualizar auditoría:", error);
      }
    });
  };

  const todosSeleccionados = useMemo(() => {
    const todos = producciones.flatMap((p) => p.flejes.map((f) => f.id));
    return todos.length > 0 && flejesSeleccionados.length === todos.length;
  }, [producciones, flejesSeleccionados]);

  return (
    <Stack spacing={3}>
      {/* PANEL SUPERIOR */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 700, fontSize: "1rem" }}
                >
                  Auditoría de Coladas y Bobinas por Producción
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Asigna en bloque la bobina auditada a los flejes seleccionados
                  dentro de las órdenes de producción.
                </Typography>
              </Box>
              <Chip
                label={`${flejesSeleccionados.length} fleje(s) seleccionado(s)`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Stack>

            <Divider />

            <Grid container spacing={1.5} sx={{ alignItems: "flex-end" }}>
              {/* Autocomplete 1: Bobina */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  options={bobinasDisponibles}
                  value={bobinaSeleccionada}
                  onChange={(_, newValue) => handleSelectBobina(newValue)}
                  getOptionLabel={(option) => `${option.codigo}`}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={
                        <Stack
                          direction="row"
                          sx={{ alignItems: "center", gap: 0.5 }}
                        >
                          <LayersIcon fontSize="small" color="primary" />
                          <span>Bobina de Auditoría</span>
                        </Stack>
                      }
                      placeholder="Buscar bobina..."
                      size="small"
                    />
                  )}
                />
              </Grid>

              {/* Selector / Input 2: Colada */}
              <Grid size={{ xs: 12, sm: 4 }}>
                {esColadaManual ? (
                  // MODO MANUAL: Campo de Texto Libre
                  <TextField
                    fullWidth
                    size="small"
                    value={
                      typeof coladaSeleccionada === "string"
                        ? coladaSeleccionada
                        : (coladaSeleccionada?.nombre ?? "")
                    }
                    onChange={(e) => setColadaSeleccionada(e.target.value)}
                    label={
                      <Stack
                        direction="row"
                        sx={{ alignItems: "center", gap: 0.5 }}
                      >
                        <BusinessIcon fontSize="small" color="primary" />
                        <span>Colada (Manual)</span>
                      </Stack>
                    }
                    placeholder="Escribir código de colada..."
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title="Cambiar a selección de lista">
                              <IconButton
                                size="small"
                                onClick={toggleModoManual}
                                color="primary"
                              >
                                <SearchIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                ) : (
                  // MODO DESPLEGABLE: Autocomplete Sincronizado
                  <Autocomplete<
                    ColadaAutocompleteOption | string,
                    false,
                    false,
                    true
                  >
                    size="small"
                    disabled={loadingColadas || !bobinaSeleccionada}
                    freeSolo
                    selectOnFocus
                    handleHomeEndKeys
                    options={coladasDisponibles}
                    loading={loadingColadas}
                    value={coladaSeleccionada ?? null}
                    onChange={(_, newValue) => {
                      if (typeof newValue === "string") {
                        handleSelectColada(newValue);
                      } else if (newValue && "inputValue" in newValue) {
                        handleSelectColada(
                          (newValue as ColadaAutocompleteOption).inputValue ??
                            "",
                        );
                      } else {
                        handleSelectColada(newValue as ColadaOpcion | null);
                      }
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(
                        options,
                        params,
                      ) as ColadaOpcion[];
                      const { inputValue } = params;

                      const isExisting = options.some((option) => {
                        const nombre =
                          typeof option === "string" ? option : option.nombre;
                        return (
                          inputValue.toLowerCase() === nombre.toLowerCase()
                        );
                      });

                      if (inputValue !== "" && !isExisting) {
                        filtered.push({
                          inputValue,
                          nombre: `Añadir "${inputValue}"`,
                          id: -1,
                        } as ColadaOpcion);
                      }

                      return filtered;
                    }}
                    getOptionLabel={(
                      option: string | ColadaAutocompleteOption,
                    ): string => {
                      if (typeof option === "string") return option;
                      if (
                        "inputValue" in option &&
                        typeof option.inputValue === "string" &&
                        option.inputValue
                      ) {
                        return option.inputValue;
                      }
                      return option.nombre;
                    }}
                    isOptionEqualToValue={(option, value) => {
                      if (!value) return false;
                      const optionNombre =
                        typeof option === "string" ? option : option.nombre;
                      const valueNombre =
                        typeof value === "string" ? value : value.nombre;
                      return optionNombre === valueNombre;
                    }}
                    renderOption={(props, option) => {
                      const { key, ...optionProps } = props;
                      const label =
                        typeof option === "string" ? option : option.nombre;
                      return (
                        <li key={key} {...optionProps}>
                          {label}
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label={
                          <Stack
                            direction="row"
                            sx={{ alignItems: "center", gap: 0.5 }}
                          >
                            <BusinessIcon fontSize="small" color="primary" />
                            <span>Colada Sincronizada</span>
                          </Stack>
                        }
                        placeholder={
                          loadingColadas
                            ? "Cargando coladas..."
                            : "Buscar colada..."
                        }
                      />
                    )}
                  />
                )}
              </Grid>

              {/* Botón Aplicar */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={
                    isPending ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  onClick={handleAplicar}
                  disabled={
                    !coladaSeleccionada ||
                    flejesSeleccionados.length === 0 ||
                    isPending ||
                    loadingColadas
                  }
                  sx={{
                    height: 40,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  {isPending
                    ? "Guardando..."
                    : "Asignar a Flejes Seleccionados"}
                </Button>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* LISTADO DE PRODUCCIONES Y TABLA */}
      <Stack spacing={2}>
        <Stack
          direction="row"
          sx={{
            px: 0.5,
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="overline"
            sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: 1 }}
          >
            Órdenes de Producción
          </Typography>
          <Button
            size="small"
            startIcon={
              todosSeleccionados ? (
                <CheckBoxIcon />
              ) : (
                <CheckBoxOutlineBlankIcon />
              )
            }
            onClick={toggleTodosLosFlejes}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {todosSeleccionados ? "Desmarcar todos" : "Marcar todos"}
          </Button>
        </Stack>

        {producciones.map((produccion) => (
          <Card
            key={produccion.id}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden" }}
          >
            {/* Header Producción */}
            <Box
              sx={{
                bgcolor: "grey.50",
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                <Paper
                  variant="outlined"
                  sx={{
                    px: 1.5,
                    py: 0.25,
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <PrecisionManufacturingIcon
                    fontSize="inherit"
                    color="action"
                  />
                  {produccion.lote} - {produccion.tubo}
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <CpuIcon fontSize="inherit" />
                  {produccion.maquina || "Sin máquina"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <CalendarIcon fontSize="inherit" />
                  {produccion.fecha
                    ? new Date(produccion.fecha).toLocaleDateString()
                    : "-"}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {produccion.flejes.length} fleje(s)
              </Typography>
            </Box>

            {/* Tabla */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell width={48} align="center">
                      #
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem" }}>
                      CÓDIGO FLEJE / LOTE
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem" }}>
                      BOBINA REAL
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: "0.7rem" }}>
                      COLADA REAL
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        bgcolor: "action.hover",
                        color: "primary.main",
                      }}
                    >
                      BOBINA AUDITADA
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.7rem",
                        bgcolor: "action.hover",
                        color: "primary.main",
                      }}
                    >
                      COLADA AUDITADA
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {produccion.flejes.map((fleje) => {
                    const isSelected = flejesSeleccionados.includes(fleje.id);
                    return (
                      <TableRow
                        key={fleje.id}
                        hover
                        selected={isSelected}
                        sx={{
                          "&.Mui-selected": {
                            bgcolor: "action.selected",
                          },
                        }}
                      >
                        <TableCell align="center" padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => toggleFleje(fleje.id)}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {fleje.lote}
                        </TableCell>
                        <TableCell color="text.secondary">
                          {fleje.bobina_concepto || "-"}
                        </TableCell>
                        <TableCell color="text.secondary">
                          {fleje.colada_nombre || "-"}
                        </TableCell>

                        <TableCell sx={{ bgcolor: "action.hover" }}>
                          {fleje.bobina_auditoria_concepto ? (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<CheckIcon fontSize="small" />}
                              label={fleje.bobina_auditoria_concepto}
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ fontStyle: "italic" }}
                            >
                              Pendiente
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ bgcolor: "action.hover" }}>
                          {fleje.colada_auditoria_nombre ? (
                            <Chip
                              size="small"
                              color="success"
                              variant="outlined"
                              icon={<CheckIcon fontSize="small" />}
                              label={fleje.colada_auditoria_nombre}
                              sx={{ fontWeight: 600 }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ fontStyle: "italic" }}
                            >
                              Pendiente
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
