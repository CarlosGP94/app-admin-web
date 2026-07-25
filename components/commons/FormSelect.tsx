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
  SelectChangeEvent,
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
  maxMenuHeight?: number;
  formControlProps?: FormControlProps;
  onChange?: (event: SelectChangeEvent<unknown>) => void;
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
  maxMenuHeight = 300,
  formControlProps,
  onChange: customOnChange,
}: FormSelectProps<TFieldValues>) {
  const displayLabel = loading
    ? `Cargando ${label.toLowerCase()}...`
    : `${label}${required ? " *" : ""}`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const handleChange = (
          event: SelectChangeEvent<unknown>,
          child: React.ReactNode,
        ) => {
          // 1. Siempre actualizamos el estado interno en React Hook Form
          field.onChange(event);

          // 2. Si el padre proporcionó un onChange custom, lo ejecutamos pasándole el evento
          if (customOnChange) {
            customOnChange(event);
          }
        };

        return (
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
              value={field.value ?? ""}
              onChange={handleChange}
              label={displayLabel}
              endAdornment={
                loading ? (
                  <InputAdornment position="end" sx={{ mr: 2 }}>
                    <CircularProgress size={20} />
                  </InputAdornment>
                ) : null
              }
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      maxHeight: maxMenuHeight,
                    },
                  },
                },
              }}
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
        );
      }}
    />
  );
}
