"use client";

import React, { createContext, useContext, useState } from "react";

// Definimos la estructura del estado que tu hook useDataTable necesita recordar
interface PlanesCorteState {
  page: number;
  searchTerm: string;
  filters: any[] | null; // Guardamos los filtros dinámicos (con sus valores y dropdowns)
  sortModel: any[];
}

interface PlanesCorteContextType {
  savedState: PlanesCorteState;
  setSavedState: React.Dispatch<React.SetStateAction<PlanesCorteState>>;
  clearSavedState: () => void;
}

// Valores por defecto para cuando el usuario entra por primera vez (o limpia filtros)
const DEFAULT_STATE: PlanesCorteState = {
  page: 1,
  searchTerm: "",
  filters: null, // Es null al inicio para que el hook useDataTable monte sus 'initFilters' por defecto
  sortModel: [],
};

const PlanesCorteContext = createContext<PlanesCorteContextType | undefined>(
  undefined,
);

export function PlanesCorteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [savedState, setSavedState] = useState<PlanesCorteState>(DEFAULT_STATE);

  const clearSavedState = () => setSavedState(DEFAULT_STATE);

  return (
    <PlanesCorteContext.Provider
      value={{ savedState, setSavedState, clearSavedState }}
    >
      {children}
    </PlanesCorteContext.Provider>
  );
}

// Hook personalizado para consumir el estado cómodamente en la página principal
export function usePlanesCorteState() {
  const context = useContext(PlanesCorteContext);
  if (!context) {
    throw new Error(
      "usePlanesCorteState debe usarse dentro de un PlanesCorteProvider",
    );
  }
  return context;
}
