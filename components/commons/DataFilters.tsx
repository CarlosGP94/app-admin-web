"use client";

import React from "react";
import {
  Card,
  Grid,
  Stack,
  Button,
  Typography,
  TextField,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress, // 🔥 Importamos el spinner de MUI
} from "@mui/material";
import { TableFilter } from "@/hooks/useDataTable";

const DataFilters: React.FC<{
  filters: TableFilter[];
  loading?: boolean;
  handleFilterChange?: (
    filterName: string,
    value: number | string,
    type?: "select" | "daterangeStart" | "daterangeEnd" | "autocomplete",
  ) => void;
  handleClearFilters?: () => void;
  handleFilter?: () => void;
}> = ({
  filters = [],
  loading = false,
  handleFilterChange = () => {},
  handleClearFilters = () => {},
  handleFilter = () => {},
}) => {
  return (
    <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Grid container spacing={2}>
        {filters.map((filter, index) => (
          <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ textTransform: "uppercase", mb: 0.5 }}
            >
              {filter?.label && <strong>{filter.label}</strong>}
            </Typography>

            {filter.type === "daterangeStart" ||
            filter.type === "daterangeEnd" ? (
              <Stack direction="row" spacing={0.5}>
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  variant="outlined"
                  disabled={loading}
                  value={filter.valueStart || ""}
                  onChange={(e) => {
                    handleFilterChange(
                      filter.name,
                      e?.target?.value ? e.target.value : "",
                      "daterangeStart",
                    );
                  }}
                />
                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  variant="outlined"
                  disabled={loading}
                  value={filter.valueEnd || ""}
                  onChange={(e) => {
                    handleFilterChange(
                      filter.name,
                      e?.target?.value ? e.target.value : "",
                      "daterangeEnd",
                    );
                  }}
                />
              </Stack>
            ) : null}

            {filter.type === "select" ? (
              <Select
                size="small"
                fullWidth
                variant="outlined"
                disabled={loading}
                value={filter.value || 0}
                onChange={(e) => {
                  handleFilterChange(
                    filter.name,
                    e?.target?.value ? Number(e.target.value) : 0,
                  );
                }}
              >
                {filter.defaultLabel && (
                  <MenuItem value={0}>{filter.defaultLabel}</MenuItem>
                )}
                {filter.options?.map((option, indexOption) => (
                  <MenuItem
                    key={option.label + indexOption}
                    value={option.value}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            ) : null}

            {filter.type === "autocomplete" && (
              <Autocomplete
                size="small"
                disabled={loading} // 🔒 Deshabilitar autocomplete en carga
                options={filter.options || []}
                getOptionLabel={(option) => option.label}
                noOptionsText="Sin opciones"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={filter.defaultLabel || ""}
                    value={filter.value || 0}
                    variant="outlined"
                    fullWidth
                    onChange={(e) => {
                      handleFilterChange(
                        filter.name,
                        e?.target?.value ? Number(e.target.value) : 0,
                      );
                    }}
                  />
                )}
              />
            )}
          </Grid>
        ))}

        {/* Grillas de balanceo */}
        {filters.length < 3 && <Grid size={{ xs: 12, sm: 6, md: 3 }} />}
        {filters.length < 2 && <Grid size={{ xs: 12, sm: 6, md: 3 }} />}
        {filters.length < 1 && <Grid size={{ xs: 12, sm: 6, md: 3 }} />}

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Stack
            sx={{
              gap: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "end",
              height: "100%",
            }}
          >
            <Button
              size="small"
              fullWidth
              variant="outlined"
              color="primary"
              disabled={loading} // 🔒 Deshabilitar botón limpiar en carga
              onClick={handleClearFilters}
            >
              Limpiar
            </Button>

            <Button
              size="small"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              onClick={handleFilter} // 🔥 Llamamos a la función handleFilter al hacer clic
              startIcon={
                loading ? <CircularProgress size={16} color="inherit" /> : null
              }
            >
              {loading ? "Cargando..." : "Filtrar"}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Card>
  );
};

export default DataFilters;
