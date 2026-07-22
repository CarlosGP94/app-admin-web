// @/components/commons/FormAutocomplete.tsx
"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  AutocompleteProps,
} from "@mui/material";

export interface AutocompleteOption {
  id: number | string;
  label: string;
}

interface FormAutocompleteProps<TFieldValues extends FieldValues> {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  placeholder?: string;
  options: AutocompleteOption[];
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  required?: boolean;
  autocompleteProps?: Partial<
    AutocompleteProps<AutocompleteOption, false, false, false>
  >;
}

export function FormAutocomplete<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  placeholder = "Seleccionar...",
  options,
  loading = false,
  disabled = false,
  fullWidth = true,
  size = "small",
  required = false,
  autocompleteProps,
}: FormAutocompleteProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const selectedOption =
          options.find((opt) => opt.id === field.value) || null;

        return (
          <Autocomplete
            options={options}
            value={selectedOption}
            loading={loading}
            disabled={disabled || loading}
            size={size}
            fullWidth={fullWidth}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, selected) => {
              field.onChange(selected ? selected.id : null);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={`${label}${required ? " *" : ""}`}
                placeholder={placeholder}
                error={!!error}
                helperText={error?.message}
                slotProps={{
                  ...params.slotProps,
                  input: {
                    ...params.slotProps.input,
                    endAdornment: (
                      <React.Fragment>
                        {loading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.slotProps.input.endAdornment}
                      </React.Fragment>
                    ),
                  },
                }}
              />
            )}
            {...autocompleteProps}
          />
        );
      }}
    />
  );
}
