"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  TextField,
} from "@mui/material";
import FileDownloadIcon from "@mui/icons-material/FileDownload";

export interface InformeSalidaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fechas: {
    fechaInicio: string;
    fechaFin: string;
  }) => void | Promise<void>;
  loading?: boolean;
}

export function InformeSalidaModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: InformeSalidaModalProps) {
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  const handleConfirm = () => {
    if (!fechaInicio || !fechaFin) return;
    onConfirm({ fechaInicio, fechaFin });
    setFechaInicio("");
    setFechaFin("");
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setFechaInicio("");
    setFechaFin("");
  };

  const isFormInvalid = !fechaInicio || !fechaFin || fechaInicio > fechaFin;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="informe-dialog-title"
    >
      <DialogTitle id="informe-dialog-title" sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FileDownloadIcon color="primary" />
          <span>Generar Informe de Salida</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Selecciona el rango de fechas para exportar el informe de salida de
          paquetes de tubos.
        </DialogContentText>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Fecha Inicio"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                max: fechaFin || undefined, // Evita seleccionar una fecha inicio superior a la fin
              },
            }}
            fullWidth
            size="small"
            disabled={loading}
          />
          <TextField
            label="Fecha Fin"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: fechaInicio || undefined, // Evita seleccionar una fecha fin inferior a la inicio
              },
            }}
            fullWidth
            size="small"
            disabled={loading}
            error={Boolean(fechaInicio && fechaFin && fechaInicio > fechaFin)}
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
          {loading ? "Generando..." : "Generar Informe"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
