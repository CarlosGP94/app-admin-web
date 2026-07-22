"use client";

import React from "react";
import Link from "next/link";
import { Stack, TextField, Button, InputAdornment } from "@mui/material";
import { Add, Search } from "@mui/icons-material";

const TopCrud: React.FC<{
  placeholder?: string;
  searchTerm: string;
  actions?: React.ReactNode;
  handleSearchChange: (value: string) => void;
  handleNew?: () => void;
  newUrl?: string; // <- Nueva propiedad opcional para pasar la ruta por parámetro
}> = ({
  placeholder = "Buscar...",
  searchTerm = "",
  actions = [],
  handleSearchChange = () => {},
  handleNew = () => {},
  newUrl,
}) => {
  return (
    <Stack
      sx={{
        mb: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <TextField
        sx={{
          width: "100%",
          maxWidth: "400px",
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          },
        }}
        size="small"
        placeholder={placeholder}
        value={searchTerm ?? ""}
        onChange={(e) => handleSearchChange(e.target.value)}
      />
      <Stack direction="row" spacing={1}>
        {actions}
        <Button
          // Si existe newUrl, inyecta el Link de Next.js y su propiedad href
          component={newUrl ? Link : "button"}
          {...(newUrl ? { href: newUrl } : { onClick: handleNew })}
          startIcon={<Add fontSize="small" />}
          sx={{ minWidth: "120px" }}
          color="primary"
          size="small"
          variant="contained"
        >
          Nuevo Elemento
        </Button>
      </Stack>
    </Stack>
  );
};

export default TopCrud;
