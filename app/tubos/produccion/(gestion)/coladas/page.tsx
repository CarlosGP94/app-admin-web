"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { Box, Typography, Paper } from "@mui/material";

export default function InsertarColadasPage() {
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids");

  // Convertimos "1,2,3" de vuelta a un array de números [1, 2, 3]
  const selectedIds = idsParam
    ? idsParam
        .split(",")
        .map((id) => Number(id))
        .filter((id) => !isNaN(id))
    : [];

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Insertar Coladas a Producciones
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Typography variant="body1">
          Se han seleccionado <strong>{selectedIds.length}</strong> producciones
          para asignar coladas.
        </Typography>

        {/* Aquí renderizas tu formulario o lógica de inserción */}
      </Paper>
    </Box>
  );
}
