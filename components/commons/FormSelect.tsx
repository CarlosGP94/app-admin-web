// @/components/commons/FormSelect.tsx
"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  InputAdornment,
  FormControlProps,
} from "@mui/material";

export interface SelectOption {
  id: number | string;
  label: string;
}

interface FormSelectProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  options: SelectOption[];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  required?: boolean;
  formControlProps?: FormControlProps;
}

export function FormSelect<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  options,
  loading = false,
  disabled = false,
  fullWidth = true,
  size = "small",
  required = false,
  formControlProps,
}: FormSelectProps<TFieldValues>) {
  const displayLabel = loading
    ? `Cargando ${label.toLowerCase()}...`
    : `${label}${required ? " *" : ""}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl
          fullWidth={fullWidth}
          size={size}
          disabled={disabled || loading}
          error={!!error}
          {...formControlProps}
        >
          <InputLabel>{displayLabel}</InputLabel>
          <Select
            {...field}
            value={field.value || ""}
            label={displayLabel}
            endAdornment={
              loading ? (
                <InputAdornment position="end" sx={{ mr: 2 }}>
                  <CircularProgress size={20} />
                </InputAdornment>
              ) : null
            }
          >
            {loading ? (
              <MenuItem disabled value="">
                Cargando opciones...
              </MenuItem>
            ) : options.length === 0 ? (
              <MenuItem disabled value="">
                No hay opciones disponibles
              </MenuItem>
            ) : (
              options.map((opt) => (
                <MenuItem key={opt.id} value={opt.id}>
                  {opt.label}
                </MenuItem>
              ))
            )}
          </Select>
          <FormHelperText>{error?.message}</FormHelperText>
        </FormControl>
      )}
    />
  );
}
