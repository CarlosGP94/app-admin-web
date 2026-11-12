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

interface EtiquetaRow {
  id: number;
  creado: string;
  maquina_id: number;
  maquina_nombre?: string;
  maquina_codigo?: string;
  turno_id: number;
  turno_prefijo?: string;
  turno_entrada?: string;
  turno_salida?: string;
  malla_id: number;
  malla_codigo?: string;
  no_paquete: number;
  lote: string;
}

export default function EtiquetasMallasPage() {
  const permission = APP_ROUTES.mallas.subRoutes.etiquetas
    ?.permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <EtiquetasMallasView />
    </ProtectedRoute>
  );
}

export function EtiquetasMallasView() {
  const fetchData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[]
  ): Promise<{ data: EtiquetaRow[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.mallas.etiquetas,
      window.location.origin
    );

    url.searchParams.append("page", String(currentPage));
    url.searchParams.append("limit", String(currentPageSize));
    if (searchTerm) {
      url.searchParams.append("search", searchTerm);
    }

    filters.forEach((filter) => {
      if (filter.type === "daterangeStart" || filter.type === "daterangeEnd") {
        if (filter.valueStart)
          url.searchParams.append(
            "fechaCorte_start",
            String(filter.valueStart)
          );
        if (filter.valueEnd)
          url.searchParams.append("fechaCorte_end", String(filter.valueEnd));
      } else if (filter.value !== undefined && filter.value !== null) {
        url.searchParams.append(filter.name, String(filter.value));
      }
    });

    if (sortModel && sortModel.length > 0) {
      const { orderBy, orderDir } = sortModel[0];
      url.searchParams.append("orderBy", orderBy);
      url.searchParams.append("orderDir", orderDir);
    }

    const response = await fetch(url.toString());
    if (!response.ok)
      throw new Error("Error al consultar las etiquetas de mallas");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: EtiquetaRow) => ({
          ...item,
        })) as EtiquetaRow[]) || [],
      total: result.total || 0,
    };
  };

  const fetchFilters = async (
    currentFilters: CurrentFilter[]
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.mallas.etiquetas_filtros,
      window.location.origin
    );

    currentFilters.forEach((filter) => {
      if (filter.type === "daterangeStart" || filter.type === "daterangeEnd") {
        if (filter.valueStart)
          url.searchParams.append(
            "fechaCorte_start",
            String(filter.valueStart)
          );
        if (filter.valueEnd)
          url.searchParams.append("fechaCorte_end", String(filter.valueEnd));
      } else if (
        filter.value !== undefined &&
        filter.value !== null &&
        filter.value !== ""
      ) {
        url.searchParams.append(filter.name, String(filter.value));
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) return {};

    const result = await response.json();
    const data = result.data || {};

    return {
      maquina_id: (data.maquinas || []).map((m: any) => ({
        value: m.id,
        label: m.maquina || m.nombre,
      })),
      turno_id: (data.turnos || []).map((t: any) => ({
        value: t.id,
        label: t.prefijo,
      })),
      creado: [
        {
          label: "limitStart",
          value: data.rangoFechas?.minFecha || null,
        },
        {
          label: "limitEnd",
          value: data.rangoFechas?.maxFecha || null,
        },
      ],
    };
  };

  const onDeleteConfirm = async (
    id: string | number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(
        `${APP_ROUTES.api.mallas.etiquetas}/${String(id)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Error al eliminar el registro de etiqueta");
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar etiqueta:", error);
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
    initFilters: [
      { name: "maquina_id", label: "Máquina", type: "select", value: "" },
      { name: "turno_id", label: "Turno", type: "select", value: "" },
      {
        name: "creado",
        label: "Fecha de corte",
        type: "daterangeStart",
        valueStart: null,
        valueEnd: null,
      },
    ],
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
        message="¿Estás seguro de que deseas eliminar esta etiqueta? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        color="error"
        onConfirm={() => {
          handleDeleteConfirm();
        }}
        onClose={() => handleDelete(null)}
      />
      <TopCrud
        newUrl={APP_ROUTES.mallas.subRoutes.etiquetas_create?.path || "#"}
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
        <Table<EtiquetaRow>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading || actionLoading}
          rows={data as EtiquetaRow[]}
          total={total}
          columns={columns((row) => {
            handleEdit(
              APP_ROUTES.mallas.subRoutes.etiquetas_edit?.path(
                row.id.toString()
              ) || "#"
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
  handleEdit: (row: EtiquetaRow) => void,
  handleDelete: (row: EtiquetaRow) => void
): Column<EtiquetaRow>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 60,
  },
  {
    id: "lote",
    width: 140,
    label: "Lote",
    align: "left",
    sortable: true,
  },
  {
    id: "malla_id",
    width: 150,
    label: "Malla",
    align: "left",
    sortable: false,
    format: (row) => row.malla_codigo || `Malla #${row.malla_id}`,
  },
  {
    id: "no_paquete",
    width: 120,
    label: "No. Paquete",
    align: "center",
    sortable: true,
  },
  {
    id: "turno_prefijo",
    width: 100,
    label: "Turno",
    align: "center",
    sortable: false,
    format: (row) => row.turno_prefijo || "-",
  },
  {
    id: "creado",
    label: "Fecha",
    width: 150,
    align: "center",
    sortable: true,
    format: (row) =>
      row.creado ? new Date(row.creado).toLocaleDateString("es-ES") : "",
  },
  {
    id: "action_id" as keyof EtiquetaRow,
    label: "Acciones",
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
        <Tooltip title="Editar etiqueta" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar etiqueta" arrow placement="top">
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
