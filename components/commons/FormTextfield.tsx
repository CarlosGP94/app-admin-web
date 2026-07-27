// @/components/commons/FormTextField.tsx
"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { TextField, TextFieldProps } from "@mui/material";

type FormTextFieldProps<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  type?:
    | "text"
    | "number"
    | "password"
    | "email"
    | "date"
    | "datetime-local"
    | "time"
    | "url"
    | "tel";
  required?: boolean;
  isNumber?: boolean;
  InputLabelProps?: React.LabelHTMLAttributes<HTMLLabelElement>;
} & Omit<TextFieldProps, "name" | "control" | "InputLabelProps">;

export function FormTextField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  type = "text",
  required = false,
  isNumber = type === "number",
  size = "small",
  fullWidth = true,
  InputLabelProps,
  slotProps,
  ...props
}: FormTextFieldProps<TFieldValues>) {
  const displayLabel = `${label}${required ? " *" : ""}`;

  // Tipos que siempre requieren el label elevado/shrink
  const isDateType = ["date", "datetime-local", "time"].includes(type);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          {...props}
          type={type}
          size={size}
          fullWidth={fullWidth}
          label={displayLabel}
          value={field.value ?? ""}
          onChange={(e) => {
            if (isNumber) {
              const val = e.target.value;
              field.onChange(val === "" ? "" : Number(val));
            } else {
              field.onChange(e.target.value);
            }
          }}
          slotProps={{
            ...slotProps,
            inputLabel: {
              ...(isDateType ? { shrink: true } : {}),
              ...(slotProps?.inputLabel as Record<string, unknown>),
              ...InputLabelProps,
            },
          }}
          error={!!error}
          helperText={error?.message || props.helperText}
        />
      )}
    />
  );
}
