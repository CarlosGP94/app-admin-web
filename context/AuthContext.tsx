"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { PermissionCode } from "@/types/auth";
import { APP_ROUTES } from "@/config/routes";

export interface UserSession {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  cargo: string;
  permisos: PermissionCode[];
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: number, token?: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper para consultar el usuario actualizado de la base de datos a partir de su ID
  const fetchUserData = useCallback(
    async (userId: number): Promise<UserSession | null> => {
      try {
        const url = new URL(APP_ROUTES.api.auth.me, window.location.origin);
        url.searchParams.append("id", String(userId));
        // Opción A: Si usas endpoint de API
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
        });

        if (!res.ok) throw new Error("No se pudo obtener el usuario");
        const responseData = await res.json();
        return responseData.data;

        /* 
      // Opción B: Si llamas a tu función de servicio directamente en el cliente/servidor
      const freshUser = await obtenerUsuarioPorIdService(userId);
      return freshUser; 
      */
      } catch (error) {
        console.error("Error al cargar datos actualizados del usuario:", error);
        return null;
      }
    },
    [],
  );

  // Login: Guarda únicamente el ID y Token, luego carga la información fresca
  const login = async (userId: number, token?: string) => {
    setIsLoading(true);
    try {
      localStorage.setItem("auth_user_id", userId.toString());
      if (token) {
        localStorage.setItem("auth_token", token);
      }

      const freshUser = await fetchUserData(userId);
      if (freshUser) {
        setUser({ ...freshUser, permisos: freshUser.permisos || [] }); // Asegúrate de mapear permisos correctamente
      } else {
        throw new Error(
          "No se pudo cargar la información del usuario tras el login.",
        );
      }
    } catch (error) {
      logout();
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout: Limpia el estado y los identificadores persistidos
  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user_id");
    localStorage.removeItem("auth_token");
  };

  // Función para forzar la recarga del usuario desde cualquier parte de la app
  const refetchUser = async () => {
    const storedUserId = localStorage.getItem("auth_user_id");
    if (storedUserId) {
      const freshUser = await fetchUserData(Number(storedUserId));
      if (freshUser) {
        setUser(freshUser);
      }
    }
  };

  // Inicialización de la sesión leyendo el ID guardado
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUserId = localStorage.getItem("auth_user_id");
        const storedToken = localStorage.getItem("auth_token");

        if (storedUserId && storedToken) {
          const freshUser = await fetchUserData(Number(storedUserId));
          if (freshUser) {
            setUser(freshUser);
          } else {
            // Si el usuario ya no existe o cambió de estado en BD, cerramos sesión
            logout();
          }
        }
      } catch (error) {
        console.error("Error al recuperar la sesión:", error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [fetchUserData]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser utilizado dentro de un AuthProvider");
  }
  return context;
};
