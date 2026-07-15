"use client";

import { styled } from "@mui/material/styles";
import { Box, Typography } from "@mui/material";

// Contenedor estilizado con el borde lateral característico de tu tema
export const MetricBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.containerLowest,
  borderRadius: theme.rounded.DEFAULT,
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  position: "relative",
  "&::before": {
    content: '""',
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "4px",
    backgroundColor: theme.palette.primary.main,
    borderRadius: `${theme.rounded.sm} 0 0 ${theme.rounded.sm}`,
  },
}));

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
}

export default function MetricCard({ title, value, unit }: MetricCardProps) {
  return (
    <MetricBox>
      {/* Título de la métrica con la tipografía bold de etiquetas */}
      <Typography variant="labelBold" color="text.secondary">
        {title}
      </Typography>

      {/* Valor numérico utilizando la fuente tabular de precisión */}
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
        <Typography
          variant="dataMono"
          sx={{ fontSize: "1.75rem", fontWeight: 700, color: "text.primary" }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {unit}
          </Typography>
        )}
      </Box>
    </MetricBox>
  );
}
