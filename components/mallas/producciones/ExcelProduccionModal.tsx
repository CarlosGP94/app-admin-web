"use client";

import React, { useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { getFechaLocalISO } from "@/utils/functions";

export interface ExcelProduccionFiltros {
  maquina_ids: number[];
  diametros: number[];
  fechaInicio: string;
  fechaFin: string;
}

export interface ExcelProduccionMaquina {
  id: number;
  nombre: string;
  maquina: string;
}

interface ExcelProduccionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (filtros: ExcelProduccionFiltros) => void | Promise<void>;
  loading?: boolean;
  maquinas: ExcelProduccionMaquina[];
  diametros: number[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

export function ExcelProduccionModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  maquinas,
  diametros,
  rangoFechas,
}: ExcelProduccionModalProps) {
  const minFecha = rangoFechas.minFecha
    ? getFechaLocalISO(rangoFechas.minFecha)
    : "";
  const maxFecha = rangoFechas.maxFecha
    ? getFechaLocalISO(rangoFechas.maxFecha)
    : "";

  const [selectedMaquinas, setSelectedMaquinas] = useState<
    ExcelProduccionMaquina[]
  >([]);
  const [selectedDiametros, setSelectedDiametros] = useState<number[]>([]);
  const [fechaInicio, setFechaInicio] = useState<string>(minFecha);
  const [fechaFin, setFechaFin] = useState<string>(maxFecha);

  const isFormInvalid =
    !fechaInicio || !fechaFin || fechaInicio > fechaFin;

  const handleConfirm = () => {
    if (isFormInvalid) return;

    onConfirm({
      maquina_ids: selectedMaquinas.map((maquina) => Number(maquina.id)),
      diametros: selectedDiametros.map(Number),
      fechaInicio,
      fechaFin,
    });
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="excel-produccion-dialog-title"
    >
      <DialogTitle id="excel-produccion-dialog-title" sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FileDownloadIcon color="primary" />
          <span>Generar Excel de producción</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Selecciona las máquinas, los diámetros y el rango de fechas para el
          informe. Si no seleccionas máquinas o diámetros se incluirán todos.
        </DialogContentText>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Autocomplete
            multiple
            options={maquinas}
            value={selectedMaquinas}
            onChange={(_event, value) => setSelectedMaquinas(value)}
            getOptionLabel={(option) =>
              option.nombre || option.maquina || `Máquina #${option.id}`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            disableCloseOnSelect
            disabled={loading}
            size="small"
            fullWidth
            slotProps={{
              listbox: {
                sx: { maxHeight: 200, overflow: "auto" },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Máquinas"
                placeholder={
                  selectedMaquinas.length === 0 ? "Todas" : "Seleccionar..."
                }
                size="small"
              />
            )}
          />

          <Autocomplete
            multiple
            options={diametros}
            value={selectedDiametros}
            onChange={(_event, value) => setSelectedDiametros(value)}
            getOptionLabel={(option) => `${option} mm`}
            isOptionEqualToValue={(option, value) => option === value}
            disableCloseOnSelect
            disabled={loading}
            size="small"
            fullWidth
            slotProps={{
              listbox: {
                sx: { maxHeight: 200, overflow: "auto" },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Diámetros"
                placeholder={
                  selectedDiametros.length === 0 ? "Todos" : "Seleccionar..."
                }
                size="small"
              />
            )}
          />

          <TextField
            label="Fecha inicio"
            type="date"
            value={fechaInicio}
            onChange={(event) => setFechaInicio(event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: minFecha || undefined,
                max: fechaFin || maxFecha || undefined,
              },
            }}
            fullWidth
            size="small"
            disabled={loading}
          />

          <TextField
            label="Fecha fin"
            type="date"
            value={fechaFin}
            onChange={(event) => setFechaFin(event.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: fechaInicio || minFecha || undefined,
                max: maxFecha || undefined,
              },
            }}
            fullWidth
            size="small"
            disabled={loading}
            error={Boolean(
              fechaInicio && fechaFin && fechaInicio > fechaFin
            )}
            helperText={
              fechaInicio && fechaFin && fechaInicio > fechaFin
                ? "La fecha de fin debe ser posterior a la fecha de inicio"
                : ""
            }
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={loading || isFormInvalid}
          variant="contained"
          color="primary"
          startIcon={<FileDownloadIcon />}
        >
          {loading ? "Generando..." : "Generar Excel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
