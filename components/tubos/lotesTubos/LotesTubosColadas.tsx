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
} from "@mui/material";
import {
  Layers as LayersIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Memory as CpuIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from "@mui/icons-material";

// --- TIPOS ---
export interface BobinaOpcion {
  id: number;
  coladaId: number;
  coladaNombre: string;
  codigo: string;
  proveedor?: string;
}

export interface FlejeDetalle {
  id: number;
  lote: string;

  // Real
  bobina_id: number;
  bobina_concepto: string;
  colada_id: number;
  colada_nombre: string;

  // Auditado
  auditoria_id: number | null;
  bobina_auditoria_id: number | null;
  bobina_auditoria_concepto: string | null;
  colada_auditoria_id: number | null;
  colada_auditoria_nombre: string | null;
}

export interface LoteTuboConFlejes {
  id: number;
  lote: string;
  maquina: string;
  fecha: string;
  flejes: FlejeDetalle[];
}

interface ComponentProps {
  lotesTubos: LoteTuboConFlejes[];
  bobinasDisponibles: BobinaOpcion[];
  onGuardarAsignacion: (
    flejesIds: number[],
    bobinaId: number,
    coladaId: number,
  ) => Promise<void>;
}

export default function TablaAuditoriaLotes({
  lotesTubos,
  bobinasDisponibles,
  onGuardarAsignacion,
}: ComponentProps) {
  // --- ESTADOS ---
  const [flejesSeleccionados, setFlejesSeleccionados] = useState<number[]>([]);
  const [bobinaSeleccionada, setBobinaSeleccionada] =
    useState<BobinaOpcion | null>(null);

  const [isPending, startTransition] = useTransition();

  // Derivar lista única de Coladas a partir de las Bobinas
  const coladasDisponibles = useMemo(() => {
    const map = new Map<number, { id: number; nombre: string }>();
    bobinasDisponibles.forEach((b) => {
      if (!map.has(b.coladaId)) {
        map.set(b.coladaId, { id: b.coladaId, nombre: b.coladaNombre });
      }
    });
    return Array.from(map.values());
  }, [bobinasDisponibles]);

  // Colada seleccionada actualmente derivada de la bobina
  const coladaSeleccionada = useMemo(() => {
    if (!bobinaSeleccionada) return null;
    return (
      coladasDisponibles.find((c) => c.id === bobinaSeleccionada.coladaId) ||
      null
    );
  }, [bobinaSeleccionada, coladasDisponibles]);

  // --- SELECCIÓN EN AUTOCOMPLETES ---
  const handleSelectBobina = (bobina: BobinaOpcion | null) => {
    setBobinaSeleccionada(bobina);
  };

  const handleSelectColada = (
    colada: { id: number; nombre: string } | null,
  ) => {
    if (!colada) {
      setBobinaSeleccionada(null);
      return;
    }
    if (!bobinaSeleccionada || bobinaSeleccionada.coladaId !== colada.id) {
      const primeraBobina = bobinasDisponibles.find(
        (b) => b.coladaId === colada.id,
      );
      if (primeraBobina) {
        setBobinaSeleccionada(primeraBobina);
      }
    }
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
    const todos = lotesTubos.flatMap((l) => l.flejes.map((f) => f.id));
    setFlejesSeleccionados(
      flejesSeleccionados.length === todos.length ? [] : todos,
    );
  };

  // --- SUBMIT / ACCIÓN ---
  const handleAplicar = () => {
    if (!bobinaSeleccionada || flejesSeleccionados.length === 0) return;

    startTransition(async () => {
      try {
        await onGuardarAsignacion(
          flejesSeleccionados,
          bobinaSeleccionada.id,
          bobinaSeleccionada.coladaId,
        );
        setFlejesSeleccionados([]);
      } catch (error) {
        console.error("Error al actualizar auditoría:", error);
      }
    });
  };

  const todosSeleccionados = useMemo(() => {
    const todos = lotesTubos.flatMap((l) => l.flejes.map((f) => f.id));
    return todos.length > 0 && flejesSeleccionados.length === todos.length;
  }, [lotesTubos, flejesSeleccionados]);

  return (
    <Stack spacing={3}>
      {/* PANEL SUPERIOR: AUTOCOMPLETES Y ACCIÓN */}
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
                  Auditoría de Coladas y Bobinas
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Asigna en bloque la bobina auditada a los flejes
                  seleccionados.
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

            <Grid container spacing={1} sx={{ alignItems: "flex-end" }}>
              {/* Autocomplete 1: Bobina */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  options={bobinasDisponibles}
                  value={bobinaSeleccionada}
                  onChange={(_, newValue) => handleSelectBobina(newValue)}
                  getOptionLabel={(option) =>
                    `${option.codigo} (Colada: ${option.coladaNombre})`
                  }
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

              {/* Autocomplete 2: Colada */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Autocomplete
                  options={coladasDisponibles}
                  value={coladaSeleccionada}
                  onChange={(_, newValue) => handleSelectColada(newValue)}
                  getOptionLabel={(option) => option.nombre}
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
                          <BusinessIcon fontSize="small" color="primary" />
                          <span>Colada Sincronizada</span>
                        </Stack>
                      }
                      placeholder="Buscar colada..."
                      size="small"
                    />
                  )}
                />
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
                    !bobinaSeleccionada ||
                    flejesSeleccionados.length === 0 ||
                    isPending
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

      {/* LISTADO DE LOTES Y TABLA */}
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
            Lotes de Tubos
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

        {lotesTubos.map((loteTubo) => (
          <Card
            key={loteTubo.id}
            variant="outlined"
            sx={{ borderRadius: 2, overflow: "hidden" }}
          >
            {/* Header Lote */}
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
                  }}
                >
                  {loteTubo.lote}
                </Paper>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <CpuIcon fontSize="inherit" />
                  {loteTubo.maquina || "Sin máquina"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <CalendarIcon fontSize="inherit" />
                  {loteTubo.fecha
                    ? new Date(loteTubo.fecha).toLocaleDateString()
                    : "-"}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {loteTubo.flejes.length} fleje(s)
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
                      CÓDIGO FLEJE
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
                  {loteTubo.flejes.map((fleje) => {
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
