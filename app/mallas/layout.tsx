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
import { Bounce, ToastContainer } from "react-toastify";
import { TIPO_PROD_MALLAS } from "@/config/constants";

export interface RegionOption {
  id: number;
  region: string;
  creado?: string;
}

export interface MaquinaOption {
  id: number;
  maquina: string;
}

export interface TurnoOption {
  id: number;
  label: string;
}

export interface OperarioOption {
  id: number;
  label: string;
}

interface MallasModuleContextType {
  title: string;
  subtitle: string;
  setTitleInfo: (title: string, subtitle: string) => void;
  maquinas: MaquinaOption[];
  loadingMaquinas: boolean;
  turnos: TurnoOption[];
  loadingTurnos: boolean;
  operarios: OperarioOption[];
  loadingOperarios: boolean;
  regiones: RegionOption[];
  loadingRegiones: boolean;
}

const MallasModuleContext = createContext<MallasModuleContextType | undefined>(
  undefined
);

export const useMallasModule = () => {
  const context = useContext(MallasModuleContext);
  if (!context) {
    throw new Error(
      "useTubosModule debe ser utilizado dentro de TubosProvider"
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

  const [maquinas, setMaquinas] = useState<MaquinaOption[]>([]);
  const [loadingMaquinas, setLoadingMaquinas] = useState<boolean>(true);

  const [operarios, setOperarios] = useState<OperarioOption[]>([]);
  const [loadingOperarios, setLoadingOperarios] = useState<boolean>(true);

  const [turnos, setTurnos] = useState<TurnoOption[]>([]);
  const [loadingTurnos, setLoadingTurnos] = useState<boolean>(true);

  const [regiones, setRegiones] = useState<RegionOption[]>([]);
  const [loadingRegiones, setLoadingRegiones] = useState<boolean>(true);

  const handleSetTitleInfo = useCallback((title: string, subtitle: string) => {
    setTitleInfo({ title, subtitle });
  }, []);

  useEffect(() => {
    async function fetchCatalogos() {
      try {
        const urlMaquinas = new URL(
          APP_ROUTES.api.general.maquinas,
          window.location.origin
        );

        const urlTurnos = new URL(
          APP_ROUTES.api.general.turnos,
          window.location.origin
        );

        const urlOperarios = new URL(
          APP_ROUTES.api.general.operarios,
          window.location.origin
        );

        const urlRegiones = new URL(
          APP_ROUTES.api.general.regiones,
          window.location.origin
        );

        // Consultamos los tres catálogos en paralelo
        const [resMaquinas, resRegiones, resTurnos, resOperarios] =
          await Promise.all([
            fetch(urlMaquinas.toString()),
            fetch(urlRegiones.toString()),
            fetch(urlTurnos.toString()),
            fetch(urlOperarios.toString()),
          ]);

        if (resMaquinas.ok) {
          const resultMaquinas = await resMaquinas.json();
          setMaquinas(resultMaquinas.data || []);
        } else {
          console.error("Error al consultar las máquinas");
        }

        if (resRegiones.ok) {
          const resultFabricantes = await resRegiones.json();
          setRegiones(resultFabricantes.data || []);
        } else {
          console.error("Error al consultar las regiones");
        }

        if (resTurnos.ok) {
          const resultTurnos = await resTurnos.json();
          setTurnos(resultTurnos.data || []);
        } else {
          console.error("Error al consultar los turnos");
        }

        if (resOperarios.ok) {
          const resultOperarios = await resOperarios.json();
          setOperarios(resultOperarios.data || []);
        } else {
          console.error("Error al consultar los operarios");
        }
      } catch (error) {
        console.error("Error al cargar los catálogos en TubosProvider:", error);
      } finally {
        setLoadingMaquinas(false);
        setLoadingRegiones(false);
        setLoadingTurnos(false);
        setLoadingOperarios(false);
      }
    }

    fetchCatalogos();
  }, []);

  return (
    <MallasModuleContext.Provider
      value={{
        title: titleInfo.title,
        subtitle: titleInfo.subtitle,
        setTitleInfo: handleSetTitleInfo,
        maquinas,
        loadingMaquinas,
        turnos,
        loadingTurnos,
        operarios,
        loadingOperarios,
        regiones,
        loadingRegiones,
      }}
    >
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={Bounce}
      />
      <DashboardLayout type={TIPO_PROD_MALLAS}>{children}</DashboardLayout>
    </MallasModuleContext.Provider>
  );
}
