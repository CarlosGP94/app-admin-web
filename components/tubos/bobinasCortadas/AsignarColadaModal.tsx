// @/components/tubos/bobinasCortadas/AsignarColadaModal.tsx
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
import FormatListBulletedAddIcon from "@mui/icons-material/FormatListBulletedAdd";

export interface AsignarColadaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (coladaNombre: string) => void | Promise<void>;
  loading?: boolean;
}

export function AsignarColadaModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: AsignarColadaModalProps) {
  const [colada, setColada] = useState<string>("");

  const handleConfirm = () => {
    if (!colada.trim()) return;
    onConfirm(colada.trim());
    setColada("");
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
    setColada("");
  };

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FormatListBulletedAddIcon color="primary" />
          <span>Asignar Colada Auditoría</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Introduce el nombre de la colada que se asignará a las bobinas
          cortadas seleccionadas.
        </DialogContentText>

        <Box sx={{ pt: 1 }}>
          <TextField
            label="Nombre de la Colada"
            value={colada}
            onChange={(e) => setColada(e.target.value)}
            fullWidth
            size="small"
            disabled={loading}
            autoFocus
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
          disabled={loading || !colada.trim()}
          variant="contained"
          color="primary"
        >
          {loading ? "Guardando..." : "Asignar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
