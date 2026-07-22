// @/components/commons/FormAutocompleteMultiple.tsx
"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Chip,
  AutocompleteProps,
} from "@mui/material";

export interface AutocompleteOption {
  id: number | string;
  label: string;
}

interface FormAutocompleteMultipleProps<TFieldValues extends FieldValues> {
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
    AutocompleteProps<AutocompleteOption, true, false, false>
  >;
}

export function FormAutocompleteMultiple<TFieldValues extends FieldValues>({
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
}: FormAutocompleteMultipleProps<TFieldValues>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const currentValues = Array.isArray(field.value)
          ? (field.value as Array<string | number>)
          : [];

        const selectedValues = options.filter((opt) =>
          currentValues.includes(opt.id),
        );

        return (
          <Autocomplete
            {...(autocompleteProps as AutocompleteProps<
              AutocompleteOption,
              true,
              false,
              false
            >)}
            multiple
            options={options}
            value={selectedValues}
            loading={loading}
            disabled={disabled || loading}
            size={size}
            fullWidth={fullWidth}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.label
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            // 1. Unicidad de keys en la lista desplegable
            renderOption={(props, option) => {
              const { key, ...optionProps } = props;
              return (
                <li key={option.id} {...optionProps}>
                  {option.label}
                </li>
              );
            }}
            // 2. Unicidad de keys en las etiquetas/chips
            renderValue={(selected, getItemProps) =>
              selected.map((option, index) => {
                const { key, ...itemProps } = getItemProps({ index });
                return (
                  <Chip
                    key={option.id}
                    label={option.label}
                    size={size}
                    {...itemProps}
                  />
                );
              })
            }
            onChange={(_, selectedOptions) => {
              field.onChange(
                selectedOptions.map((opt) =>
                  typeof opt === "string" ? opt : opt.id,
                ) as (string | number)[],
              );
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
          />
        );
      }}
    />
  );
}
