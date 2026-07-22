// @/components/commons/FormTextField.tsx
"use client";

import React from "react";
import { Controller, Control, FieldValues, Path } from "react-hook-form";
import { TextField, TextFieldProps } from "@mui/material";

type FormTextFieldProps<TFieldValues extends FieldValues> = {
  name: Path<TFieldValues>;
  control: Control<TFieldValues>;
  label: string;
  type?: "text" | "number" | "password" | "email";
  required?: boolean;
  isNumber?: boolean;
} & Omit<TextFieldProps, "name" | "control">;

export function FormTextField<TFieldValues extends FieldValues>({
  name,
  control,
  label,
  type = "text",
  required = false,
  isNumber = type === "number",
  size = "small",
  fullWidth = true,
  ...props
}: FormTextFieldProps<TFieldValues>) {
  const displayLabel = `${label}${required ? " *" : ""}`;

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
          error={!!error}
          helperText={error?.message || props.helperText}
        />
      )}
    />
  );
}
