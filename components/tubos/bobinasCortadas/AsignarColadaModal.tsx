// @/components/tubos/bobinasCortadas/AsignarColadaModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  TextField,
  Autocomplete,
  Alert,
  Typography,
  CircularProgress,
} from "@mui/material";
import FormatListBulletedAddIcon from "@mui/icons-material/FormatListBulletedAdd";
import { APP_ROUTES } from "@/config/routes";

export interface ColadaOption {
  id: number;
  colada: string;
}

export interface AsignarColadaPayload {
  coladaId: number | null;
  coladaNombre: string;
}

export interface AsignarColadaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: AsignarColadaPayload) => void | Promise<void>;
  loading?: boolean;
  fabricante?: {
    id: number | string;
    nombre: string;
  } | null;
  coladasDisponibles?: ColadaOption[];
}

export function AsignarColadaModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  fabricante,
  coladasDisponibles: coladasIniciales = [],
}: AsignarColadaModalProps) {
  // Estado para las coladas disponibles (se llena inicialmente con las props o vía fetch)
  const [coladas, setColadas] = useState<ColadaOption[]>(coladasIniciales);
  const [loadingColadas, setLoadingColadas] = useState<boolean>(false);
  const coladasDisponibles = fabricante?.id ? coladas : [];

  // Estado para el objeto seleccionado del Autocomplete o valor personalizado
  const [selectedValue, setSelectedValue] = useState<
    ColadaOption | string | null
  >(null);
  // Estado para el texto crudo del input
  const [inputValue, setInputValue] = useState<string>("");

  // Efecto que busca las coladas cada vez que varía el fabricante cuando el modal está abierto
  useEffect(() => {
    if (!open) return;

    if (!fabricante?.id) {
      return;
    }

    const fetchColadasPorFabricante = async () => {
      setLoadingColadas(true);
      try {
        // Llamada a la API de filtros filtrando por fabricante
        const response = await fetch(
          APP_ROUTES.api.tubos.bobinas_coladas +
            `?fabricanteId=${fabricante.id}`
        );

        if (!response.ok) {
          throw new Error("Error al obtener las coladas");
        }
        const data = await response.json();

        // La API devuelve data.coladas
        setColadas(data?.data || []);
      } catch (error) {
        console.error("❌ Error al cargar las coladas del fabricante:", error);
        setColadas([]);
      } finally {
        setLoadingColadas(false);
      }
    };

    fetchColadasPorFabricante();
  }, [open, fabricante?.id]);

  const resetForm = () => {
    setSelectedValue(null);
    setInputValue("");
    setColadas(coladasIniciales);
  };

  const handleConfirm = () => {
    let coladaId: number | null = null;
    let coladaNombre = "";

    if (typeof selectedValue === "string") {
      coladaNombre = selectedValue.trim();
    } else if (selectedValue && typeof selectedValue === "object") {
      coladaId = selectedValue.id;
      coladaNombre = selectedValue.colada;
    } else if (inputValue.trim() !== "") {
      coladaNombre = inputValue.trim();

      const coincidencia = coladas.find(
        (c) => c.colada.toLowerCase() === coladaNombre.toLowerCase()
      );
      if (coincidencia) {
        coladaId = coincidencia.id;
      }
    }

    if (!coladaNombre) return;

    onConfirm({
      coladaId,
      coladaNombre,
    });
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const isFormValid = Boolean(
    (typeof selectedValue === "string" && selectedValue.trim()) ||
    (selectedValue && typeof selectedValue === "object") ||
    inputValue.trim()
  );

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        transition: {
          onExited: resetForm,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FormatListBulletedAddIcon color="primary" />
          <span>Asignar Colada Auditoría</span>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Notificación de Fabricante */}
        {fabricante?.id && fabricante?.nombre && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Asignando colada para el fabricante:{" "}
              <strong>{fabricante.nombre}</strong>
            </Typography>
          </Alert>
        )}

        <DialogContentText sx={{ mb: 2 }}>
          Selecciona una colada existente de la lista o escribe una nueva para
          crearla automáticamente.
        </DialogContentText>

        <Box sx={{ pt: 1 }}>
          <Autocomplete
            freeSolo
            options={coladasDisponibles}
            loading={loadingColadas}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;
              return option.colada;
            }}
            value={selectedValue}
            onChange={(_event, newValue) => {
              setSelectedValue(newValue);
            }}
            inputValue={inputValue}
            onInputChange={(_event, newInputValue) => {
              setInputValue(newInputValue);
            }}
            disabled={loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Colada"
                placeholder="Selecciona o escribe una colada..."
                size="small"
                fullWidth
                autoFocus
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps?.input,
                    endAdornment: (
                      <React.Fragment>
                        {loadingColadas ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.slotProps?.input?.endAdornment}
                      </React.Fragment>
                    ),
                  },
                }}
              />
            )}
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
          disabled={loading || loadingColadas || !isFormValid}
          variant="contained"
          color="primary"
        >
          {loading ? "Guardando..." : "Asignar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
