"use client";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { APP_ROUTES } from "@/config/routes";
import Mantenimiento from "@/views/maintance/Maintance";

export default function TubosPage() {
  const permission = APP_ROUTES.tubos.subRoutes.produccion_coladas
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <TubosView />
    </ProtectedRoute>
  );
}

export function TubosView() {
  //   const {} = useDataTable({
  //     initFilters: [],
  //     fetchData: async (
  //       _page: number,
  //       _pageSize: number,
  //       _searchTerm: string,
  //       _filters: TableFilter[],
  //       _sortModel: unknown[],
  //     ) => {
  //       return { data: [], total: 0 };
  //     },
  //   });

  return (
    <Mantenimiento hideButton hidebar redirectUrl="/" buttonText="Inicio" />
  );
}
