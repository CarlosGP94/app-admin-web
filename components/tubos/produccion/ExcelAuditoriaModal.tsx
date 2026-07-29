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

export interface ExcelAuditoriaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (fechas: {
    fechaInicio: string;
    fechaFin: string;
  }) => void | Promise<void>;
  loading?: boolean;
}

export function ExcelAuditoriaModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: ExcelAuditoriaModalProps) {
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  const handleConfirm = () => {
    if (!fechaInicio || !fechaFin) return;
    onConfirm({ fechaInicio, fechaFin });
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
      onClose={loading ? undefined : handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="excel-auditoria-dialog-title"
    >
      <DialogTitle id="excel-auditoria-dialog-title" sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FileDownloadIcon color="primary" />
          <span>Generar Excel Auditoría</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Selecciona el rango de fechas para exportar el archivo Excel de
          auditoría de producción.
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
                max: fechaFin || undefined,
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
                min: fechaInicio || undefined,
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
          {loading ? "Generando..." : "Confirmar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
