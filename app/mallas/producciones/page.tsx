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

interface ProduccionMalla {
  id: number;
  turno_id: number;
  malla_id: number;
  malla_codigo?: string;
  paquete: number;
  lote: string;
  unidades: number;
  sl: number;
  st: number;
  longitudinales: number;
  transversales: number;
  diametro: number;
  observacion: string;
  ancho: number;
  largo: number;
  maquina_id: number;
  maquina_nombre?: string;
  creado: string;
}

export default function ProduccionMallasPage() {
  const permission = APP_ROUTES.mallas.subRoutes.producciones
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ProduccionMallasView />
    </ProtectedRoute>
  );
}

export function ProduccionMallasView() {
  const fetchData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[]
  ): Promise<{ data: ProduccionMalla[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.mallas.producciones,
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
      throw new Error("Error al consultar la producción de mallas");

    const result = await response.json();
    console.log("response", result.data);
    return {
      data:
        (result.data.map((item: ProduccionMalla) => ({
          ...item,
        })) as ProduccionMalla[]) || [],
      total: result.total || 0,
    };
  };

  const fetchFilters = async (
    currentFilters: CurrentFilter[]
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.mallas.producciones_filtros ||
        `${APP_ROUTES.api.mallas.producciones}/filtros`,
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
    console.log("filters data", data);

    return {
      maquina_id: (data.maquinas || []).map((m: any) => ({
        value: m.id,
        label: m.maquina,
      })),
      diametro: (data.diametros || []).map((d: number) => ({
        value: d,
        label: `${d} mm`,
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
        `${APP_ROUTES.api.mallas.producciones}/${String(id)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok)
        throw new Error("Error al eliminar el registro de producción");
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar producción:", error);
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
      { name: "diametro", label: "Diámetro", type: "select", value: "" },
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
        message="¿Estás seguro de que deseas eliminar este registro de producción? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        color="error"
        onConfirm={() => {
          handleDeleteConfirm();
        }}
        onClose={() => handleDelete(null)}
      />
      <TopCrud
        newUrl={APP_ROUTES.mallas.subRoutes.producciones_create.path}
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
        <Table<ProduccionMalla>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading || actionLoading}
          rows={data as ProduccionMalla[]}
          total={total}
          columns={columns((row) => {
            handleEdit(
              APP_ROUTES.mallas.subRoutes.producciones_edit.path(
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
  handleEdit: (row: ProduccionMalla) => void,
  handleDelete: (row: ProduccionMalla) => void
): Column<ProduccionMalla>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 60,
  },
  {
    id: "lote",
    width: 130,
    label: "Lotes",
    align: "left",
    sortable: true,
  },
  {
    id: "malla_id",
    width: 120,
    label: "Malla",
    align: "left",
    sortable: false,
    format: (row) => row.malla_codigo || `Malla #${row.malla_id}`,
  },
  {
    id: "paquete",
    width: 120,
    label: "No. Paq",
    align: "center",
    sortable: true,
  },
  {
    id: "unidades",
    width: 150,
    label: "Uds Por Paq",
    align: "center",
    sortable: true,
  },
  {
    id: "diametro",
    width: 110,
    label: "Diámetro",
    align: "center",
    sortable: true,
    format: (row) => `${row.diametro}`,
  },
  {
    id: "largo",
    width: 140,
    label: "Largo x Ancho",
    align: "center",
    sortable: false,
    format: (row) => `${row.largo} x ${row.ancho}`,
  },
  {
    id: "longitudinales",
    width: 160,
    label: "Longitudinales",
    align: "center",
    sortable: false,
    format: (row) => `${row.longitudinales}`,
  },
  {
    id: "transversales",
    width: 160,
    label: "Transversales",
    align: "center",
    sortable: false,
    format: (row) => `${row.transversales}`,
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
    id: "action_id" as keyof ProduccionMalla,
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
        <Tooltip title="Editar producción" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar producción" arrow placement="top">
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
