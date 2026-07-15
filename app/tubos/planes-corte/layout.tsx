// app/tubos/planes-corte/layout.tsx
"use client";

import React, { createContext, useContext, useState } from "react";
import { PersistedTableState } from "@/hooks/useDataTable";

interface PlanesCorteContextType {
  savedState: PersistedTableState;
  setSavedState: React.Dispatch<React.SetStateAction<PersistedTableState>>;
}

const PlanesCorteContext = createContext<PlanesCorteContextType | undefined>(
  undefined,
);

const INITIAL_STATE: PersistedTableState = {
  page: 1,
  searchTerm: "",
  filters: null,
  sortModel: [],
};

export default function PlanesCorteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [savedState, setSavedState] =
    useState<PersistedTableState>(INITIAL_STATE);

  return (
    <PlanesCorteContext.Provider value={{ savedState, setSavedState }}>
      {children}
    </PlanesCorteContext.Provider>
  );
}

export function usePlanesCorteState() {
  const context = useContext(PlanesCorteContext);
  if (!context) {
    throw new Error(
      "usePlanesCorteState debe usarse dentro de un PlanesCorteLayout",
    );
  }
  return context;
}
