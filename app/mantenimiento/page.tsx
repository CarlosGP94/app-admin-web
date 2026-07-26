import React from "react";
import Mantenimiento from "@/views/maintance/Maintance";
import { Box } from "@mui/material";

export default function MantenimientoPage() {
  return (
    <Box sx={{ height: "100vh", width: "100%" }}>
      <Mantenimiento redirectUrl="/" buttonText="Inicio" />
    </Box>
  );
}
