"use client";

import React from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface Plantilla {
  id: number;
  tipo: string;
  numero_varillas: string;
  peso: string;
  unidades_paquetes: string;
  lote: string;
  numero_paquetes: string;
  nombre: string;
  titulo: string;
  creado: string;
}

export default function PlantillasPage() {
  const permission = APP_ROUTES.mallas.subRoutes.plantillas
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <PlantillasView />
    </ProtectedRoute>
  );
}

export function PlantillasView() {
  const fetchData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[]
  ): Promise<{ data: Plantilla[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.mallas.plantillas,
      window.location.origin
    );

    url.searchParams.append("page", String(currentPage));
    url.searchParams.append("limit", String(currentPageSize));
    if (searchTerm) {
      url.searchParams.append("search", searchTerm);
    }

    filters.forEach((filter) => {
      if (filter.value !== undefined && filter.value !== null) {
        url.searchParams.append(filter.name, String(filter.value));
      }
    });

    if (sortModel && sortModel.length > 0) {
      const { orderBy, orderDir } = sortModel[0];
      url.searchParams.append("orderBy", orderBy);
      url.searchParams.append("orderDir", orderDir);
    }

    const response = await fetch(url.toString());

    if (!response.ok) throw new Error("Error al consultar las plantillas");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: Plantilla) => ({
          ...item,
        })) as Plantilla[]) || [],
      total: result.total || 0,
    };
  };

  const fetchFilters = async (
    currentFilters: CurrentFilter[]
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    // Si en el futuro implementas filtros específicos para plantillas, puedes agregarlos aquí.
    return {};
  };

  const onDeleteConfirm = async (
    id: string | number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(
        `${APP_ROUTES.api.mallas.plantillas}/${String(id)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Error al eliminar la plantilla");
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar la plantilla:", error);
      return {
        success: false,
        error: (error as Error).message || String(error),
      };
    }
  };

  const {
    page,
    total,
    data,
    searchTerm,
    filters,
    loadingFilters,
    loading,
    actionLoading,
    sortModel,
    showDeleteConfirm,
    handleDeleteConfirm,
    handleSortModel,
    handlePageChange,
    handleEdit,
    handleDelete,
    handleFilterChange,
    handleClearAllFilters,
    handleFilter,
  } = useDataTable({
    initFilters: [],
    onDeleteConfirm: onDeleteConfirm,
    fetchData: fetchData,
    fetchFilters: fetchFilters,
  });

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "calc(100vh - 114px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Confirmar eliminación"
        message="¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        color="error"
        onConfirm={() => {
          handleDeleteConfirm();
        }}
        onClose={() => handleDelete(null)}
      />
      <TopCrud
        newUrl={APP_ROUTES.mallas.subRoutes.plantillas_create.path}
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
      />
      {filters.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <DataFilters
            filters={filters}
            loading={loadingFilters}
            handleFilter={handleFilter}
            handleFilterChange={handleFilterChange}
            handleClearFilters={handleClearAllFilters}
          />
        </Box>
      )}
      <Box sx={{ height: "calc(100vh - 285px)", overflow: "hidden" }}>
        <Table<Plantilla>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading || actionLoading}
          rows={data as Plantilla[]}
          total={total}
          columns={columns((row) => {
            handleEdit(
              APP_ROUTES.mallas.subRoutes.plantillas_edit.path(
                row.id.toString()
              )
            );
          }, handleDelete)}
          rowKeyExtractor={(row) => row.id}
          handlePageChange={handlePageChange}
        />
      </Box>
    </Box>
  );
}

const columns = (
  handleEdit: (row: Plantilla) => void,
  handleDelete: (row: Plantilla) => void
): Column<Plantilla>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 60,
  },
  {
    id: "nombre",
    width: 180,
    label: "Nombre",
    align: "left",
    sortable: true,
  },
  {
    id: "titulo",
    width: 250,
    label: "Título",
    align: "left",
    sortable: true,
  },
  {
    id: "tipo",
    width: 150,
    label: "Tipo",
    align: "left",
    sortable: false,
  },
  {
    id: "lote",
    width: 120,
    label: "Lote",
    align: "center",
    sortable: false,
  },
  {
    id: "creado",
    label: "FECHA CREACIÓN",
    width: 160,
    align: "center",
    sortable: true,
    format: (row) =>
      row.creado ? new Date(row.creado).toLocaleDateString("es-ES") : "",
  },
  {
    id: "action_id" as keyof Plantilla,
    label: "ACCIONES",
    width: 140,
    align: "center",
    format: (row) => (
      <Box
        sx={{
          display: "flex",
          gap: 0.5,
          justifyContent: "center",
          width: "100%",
        }}
      >
        <Tooltip title="Editar plantilla" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar plantilla" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleDelete(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#ef4444" } }}
          >
            <Trash2 size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    ),
  },
];
