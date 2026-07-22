// @/context/TubosContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import DashboardLayout from "@/components/commons/DashboardLayout";
import { APP_ROUTES } from "@/config/routes";

export interface CalidadOption {
  id: number;
  nombre: string;
  creado?: string;
  label_bobina?: string | null;
  label_fleje?: string | null;
  label_tubo?: string | null;
  mostrar_tubos?: number | null;
}

export interface TipoTuboOption {
  id: number;
  nombre: string;
  creado?: string;
  prefijo?: string | null;
  medida?: string | null;
}

export interface MaquinaOption {
  id: number;
  maquina: string;
}

interface TubosModuleContextType {
  title: string;
  subtitle: string;
  setTitleInfo: (title: string, subtitle: string) => void;
  calidades: CalidadOption[];
  loadingCalidades: boolean;
  tipos: TipoTuboOption[];
  loadingTipos: boolean;
  maquinas: MaquinaOption[];
  loadingMaquinas: boolean;
}

const TubosModuleContext = createContext<TubosModuleContextType | undefined>(
  undefined,
);

export const useTubosModule = () => {
  const context = useContext(TubosModuleContext);
  if (!context) {
    throw new Error(
      "useTubosModule debe ser utilizado dentro de TubosProvider",
    );
  }
  return context;
};

export default function TubosProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [titleInfo, setTitleInfo] = useState({
    title: "",
    subtitle: "",
  });

  const [calidades, setCalidades] = useState<CalidadOption[]>([]);
  const [loadingCalidades, setLoadingCalidades] = useState<boolean>(true);

  const [tipos, setTipos] = useState<TipoTuboOption[]>([]);
  const [loadingTipos, setLoadingTipos] = useState<boolean>(true);

  const [maquinas, setMaquinas] = useState<MaquinaOption[]>([]);
  const [loadingMaquinas, setLoadingMaquinas] = useState<boolean>(true);

  const handleSetTitleInfo = useCallback((title: string, subtitle: string) => {
    setTitleInfo({ title, subtitle });
  }, []);

  useEffect(() => {
    async function fetchCatalogos() {
      try {
        const urlCalidades = new URL(
          APP_ROUTES.api.tubos.calidades,
          window.location.origin,
        );
        const urlTipos = new URL(
          APP_ROUTES.api.tubos.tipos,
          window.location.origin,
        );
        const urlMaquinas = new URL(
          APP_ROUTES.api.tubos.maquinas, // Asegúrate de tener la ruta en tu config de routes (o APP_ROUTES.api.maquinas)
          window.location.origin,
        );

        // Consultamos los tres catálogos en paralelo
        const [resCalidades, resTipos, resMaquinas] = await Promise.all([
          fetch(urlCalidades.toString()),
          fetch(urlTipos.toString()),
          fetch(urlMaquinas.toString()),
        ]);

        if (resCalidades.ok) {
          const resultCalidades = await resCalidades.json();
          setCalidades(resultCalidades.data || []);
        } else {
          console.error("Error al consultar las calidades");
        }

        if (resTipos.ok) {
          const resultTipos = await resTipos.json();
          setTipos(resultTipos.data || []);
        } else {
          console.error("Error al consultar los tipos de tubos");
        }

        if (resMaquinas.ok) {
          const resultMaquinas = await resMaquinas.json();
          setMaquinas(resultMaquinas.data || []);
        } else {
          console.error("Error al consultar las máquinas");
        }
      } catch (error) {
        console.error("Error al cargar los catálogos en TubosProvider:", error);
      } finally {
        setLoadingCalidades(false);
        setLoadingTipos(false);
        setLoadingMaquinas(false);
      }
    }

    fetchCatalogos();
  }, []);

  return (
    <TubosModuleContext.Provider
      value={{
        title: titleInfo.title,
        subtitle: titleInfo.subtitle,
        setTitleInfo: handleSetTitleInfo,
        calidades,
        loadingCalidades,
        tipos,
        loadingTipos,
        maquinas,
        loadingMaquinas,
      }}
    >
      <DashboardLayout>{children}</DashboardLayout>
    </TubosModuleContext.Provider>
  );
}
