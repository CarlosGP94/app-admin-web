"use client";

import React from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton, Tooltip, Button } from "@mui/material";
import { Eye, Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import FormatListBulletedAddIcon from "@mui/icons-material/FormatListBulletedAdd";

interface LoteTubo {
  id: number;
  lote: string;
  maquina: string;
  action_id: number;
  fecha: string;
}

export default function LotesTubosPage() {
  const permission = APP_ROUTES.tubos.subRoutes.lotes_tubos
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    // <ProtectedRoute requiredPermission={permission}>
    <LotesTubosView />
    // </ProtectedRoute>
  );
}

export function LotesTubosView() {
  const router = useRouter();
  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: LoteTubo[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.tubos.lotes_tubos,
      window.location.origin,
    );

    url.searchParams.append("page", String(currentPage));
    url.searchParams.append("limit", String(currentPageSize));
    if (searchTerm) {
      url.searchParams.append("search", searchTerm);
    }

    if (sortModel && sortModel.length > 0) {
      const { orderBy, orderDir } = sortModel[0];
      url.searchParams.append("orderBy", orderBy);
      url.searchParams.append("orderDir", orderDir);
    }

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Error al consultar los lotes de tubos");

    const result = await response.json();

    return {
      data:
        (result.data.map((item: LoteTubo) => ({
          ...item,
          action_id: item.id,
        })) as LoteTubo[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (
    currentFilters: CurrentFilter[],
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.tubos.lotes_tubos_filtros,
      window.location.origin,
    );

    currentFilters.forEach((filter) => {
      if (filter.type === "daterangeStart" || filter.type === "daterangeEnd") {
        if (filter.valueStart)
          url.searchParams.append(
            "fechaCorte_start",
            String(filter.valueStart),
          );
        if (filter.valueEnd)
          url.searchParams.append("fechaCorte_end", String(filter.valueEnd));
      } else if (filter.value !== undefined && filter.value !== null) {
        url.searchParams.append(filter.name, String(filter.value));
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error("Error al consultar los planes de corte");
    const result = await response.json();

    return {
      maquina: result.data.maquinas.map(
        (item: { id: number; nombre: string }) => ({
          value: item.id,
          label: item.nombre,
        }),
      ),
      creado: [
        {
          label: "limitStart",
          value: result.data.rangoFechas.minFecha || null,
        },
        {
          label: "limitEnd",
          value: result.data.rangoFechas.maxFecha || null,
        },
      ],
    };
  };

  const onDeleteConfirm = async (
    id: string | number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await fetch(APP_ROUTES.api.tubos.planes_corte_detalle(String(id)), {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar los lotes de tubos:", error);
      return { success: false, error: (error as string) || String(error) };
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
    sortModel,
    selectedIds,
    showDeleteConfirm,
    handleSortModel,
    handlePageChange,
    handleDelete,
    handleFilterChange,
    handleClearAllFilters,
    handleFilter,
    handleSelectItems,
    handleDeleteConfirm,
  } = useDataTable({
    initFilters: [
      {
        name: "maquina",
        label: "Máquina",
        type: "select",
        value: 0,
        defaultLabel: "Todas las máquinas",
      },
      {
        name: "creado",
        label: "Fecha de corte",
        type: "daterangeStart",
        valueStart: null,
        valueEnd: null,
      },
    ],
    onDeleteConfirm: onDeleteConfirm,
    fetchData: fecthData,
    fetchFilters: fecthFilters,
  });

  const handleInsertarColadas = () => {
    if (selectedIds.length === 0) return;

    const idsQuery = selectedIds.join(",");

    router.push(
      `${APP_ROUTES.tubos.subRoutes.lotes_tubos_coladas.path}?ids=${idsQuery}`,
    );
  };

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
        message="¿Estás seguro de que deseas eliminar este tubo? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        color="error"
        onConfirm={() => {
          handleDeleteConfirm();
        }}
        onClose={() => handleDelete(null)}
      />
      <TopCrud
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
        actions={
          <>
            <Button
              disabled={selectedIds.length === 0}
              onClick={handleInsertarColadas}
              startIcon={<FormatListBulletedAddIcon fontSize="small" />}
              sx={{ minWidth: "120px" }}
              color="primary"
              size="small"
              variant="contained"
            >
              Insertar Coladas ({selectedIds.length})
            </Button>
          </>
        }
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
        <Table<LoteTubo>
          selectable
          selectedIds={selectedIds}
          onSelectionChange={handleSelectItems}
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading}
          rows={data as LoteTubo[]}
          total={total}
          columns={columns()}
          rowKeyExtractor={(row) => row.id}
          handlePageChange={handlePageChange}
        />
      </Box>
    </Box>
  );
}

const columns = (): Column<LoteTubo>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 80,
    sortable: true,
  },
  {
    id: "lote",
    label: "Lote",
    align: "left",
    sortable: true,
  },
  {
    id: "maquina",
    label: "Máquina",
    align: "center",
  },
  {
    id: "fecha",
    label: "FECHA CREACIÓN",
    width: 150,
    align: "center",
    format: (row) => new Date(row.fecha).toLocaleDateString("es-ES"),
  },
];
