"use client";

import React from "react";
import { Stack, TextField, Button, InputAdornment } from "@mui/material";
import { Add, Search } from "@mui/icons-material";

const TopCrud: React.FC<{
  placeholder?: string;
  searchTerm: string;
  handleSearchChange: (value: string) => void;
  handleNew?: () => void;
}> = ({
  placeholder = "Buscar...",
  searchTerm = "",
  handleSearchChange = () => {},
  handleNew = () => {},
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
      <Button
        startIcon={<Add fontSize="small" />}
        sx={{ minWidth: "120px" }}
        color="primary"
        size="small"
        variant="contained"
        onClick={handleNew}
      >
        Nuevo Elemento
      </Button>
    </Stack>
  );
};

export default TopCrud;
