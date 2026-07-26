"use client";

import React, { useEffect, use } from "react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useLayoutTitle } from "../../layout";
import Table, { Column } from "@/components/commons/Table";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface BobinaCortada {
  id: number;
  bobina_concepto: string;
  colada: string;
  turno_prefijo: string;
  operario: string;
  action_id: number;
  fecha: string;
}

export default function PlanesCorteBobinasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const permission = APP_ROUTES.tubos.subRoutes.planes_corte_bobinas
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <PlanesCorteBobinasView params={params} />
    </ProtectedRoute>
  );
}

export function PlanesCorteBobinasView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { setTitleInfo } = useLayoutTitle();
  const { id } = use(params);

  useEffect(() => {
    setTitleInfo(
      "Plan de corte " + id + " - Bobinas",
      "Aquí puedes ver las bobinas asociadas al plan de corte seleccionado.",
    );
  }, [setTitleInfo]);

  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: BobinaCortada[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.tubos.bobinas_cortadas,
      window.location.origin,
    );

    if (!id) {
      throw new Error("El ID del plan de corte no está definido.");
    }

    url.searchParams.append("page", String(currentPage));
    url.searchParams.append("limit", String(currentPageSize));
    if (searchTerm) {
      url.searchParams.append("search", searchTerm);
    }

    url.searchParams.append("planCorte", id);

    if (sortModel && sortModel.length > 0) {
      const { orderBy, orderDir } = sortModel[0];
      url.searchParams.append("orderBy", orderBy);
      url.searchParams.append("orderDir", orderDir);
    }

    const response = await fetch(url.toString());
    if (!response.ok)
      throw new Error("Error al consultar las bobinas cortadas");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: BobinaCortada) => ({
          ...item,
        })) as BobinaCortada[]) || [],
      total: result.total || 0,
    };
  };

  const {
    page,
    total,
    data,
    loading,
    sortModel,
    handleSortModel,
    handlePageChange,
  } = useDataTable({
    initFilters: [],
    fetchData: fecthData,
    fetchFilters: async () => ({}),
  });

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "calc(100vh - 175px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Table<BobinaCortada>
        sortModel={sortModel}
        onSortModelChange={handleSortModel}
        page={page}
        loading={loading}
        rows={data as BobinaCortada[]}
        total={total}
        columns={columns()}
        rowKeyExtractor={(row) => row.id}
        handlePageChange={handlePageChange}
      />
    </Box>
  );
}

const columns = (): Column<BobinaCortada>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 20,
  },
  {
    id: "bobina_concepto",
    minWidth: 200,
    label: "Bobina",
    align: "left",
    sortable: true,
  },
  {
    id: "colada",
    label: "Colada",
    align: "left",
    sortable: true,
  },
  {
    id: "turno_prefijo",
    label: "Turno",
    width: 100,
    align: "center",
  },
  {
    id: "operario",
    label: "Operario",
    align: "left",
    sortable: true,
  },
  {
    id: "fecha",
    label: "FECHA CREACIÓN",
    width: 150,
    align: "center",
    format: (row) => new Date(row.fecha).toLocaleDateString("es-ES"),
  },
];
