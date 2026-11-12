"use client";

import React, { useState } from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES, PERMISOS } from "@/config/routes";
import {
  Box,
  IconButton,
  Chip,
  Typography,
  Tooltip,
  Button,
  CircularProgress,
} from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { tienePermiso } from "@/utils/functions";

interface IOption {
  id: number;
  nombre: string;
}
interface Malla {
  id: number;
  codigo: string;
  art_codigo: string;
  designacion: string;
  art_concepto: string;
  activo: boolean;
  ancho: number;
  largo: number;
  diametro: number;
  longitudinales: number;
  transversales: number;
  sl: number;
  st: number;
  peso_por_paquete: number;
  unidades_por_paquete: number;
  region_id: number;
  certificado_id: number;
  action_id: number;
  creado: string;
}

export default function MallasPage() {
  const permission = APP_ROUTES.mallas.subRoutes.mallas
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <MallasView />
    </ProtectedRoute>
  );
}

export function MallasView() {
  const { user } = useAuth();
  const [loadingInforme, setLoadingInforme] = useState(false);

  const userPermissions = user?.permisos || [];
  const informeInventarioPermission = tienePermiso(
    userPermissions,
    PERMISOS.tubos.tubos.informe
  );

  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[]
  ): Promise<{ data: Malla[]; total: number }> => {
    const url = new URL(APP_ROUTES.api.mallas.mallas, window.location.origin);

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
    if (!response.ok) throw new Error("Error al consultar las mallas");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: Malla) => ({
          ...item,
        })) as Malla[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (
    currentFilters: CurrentFilter[]
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.mallas.mallas_filtros,
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
      } else if (filter.value !== undefined && filter.value !== null) {
        url.searchParams.append(filter.name, String(filter.value));
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok)
      throw new Error("Error al consultar los filtros de mallas");
    const result = await response.json();
    console.log("result filters", result);
    return {
      regiones: result.data.regiones.map((r: IOption) => ({
        label: r.nombre,
        value: r.id,
      })),
      diametros: result.data.diametros.map((d: number) => ({
        label: d.toString(),
        value: d,
      })),
      longitudinales: result.data.longitudinales.map((l: number) => ({
        label: l.toString(),
        value: l,
      })),
      transversales: result.data.transversales.map((t: number) => ({
        label: t.toString(),
        value: t,
      })),
    };
  };

  const onDeleteConfirm = async (
    id: string | number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await fetch(APP_ROUTES.api.mallas.mallas_detalle(String(id)), {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar la malla:", error);
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
      {
        name: "regiones",
        label: "Región",
        type: "select",
        value: null,
        defaultLabel: "Todas las regiones",
        options: [],
      },
      {
        name: "diametros",
        label: "Diámetro",
        type: "select",
        value: null,
        defaultLabel: "Todos los diámetros",
        options: [],
      },
      {
        name: "longitudinales",
        label: "Longitudinales",
        type: "select",
        value: null,
        defaultLabel: "Todos los longitudinales",
        options: [],
      },
      {
        name: "transversales",
        label: "Transversales",
        type: "select",
        value: null,
        defaultLabel: "Todos los transversales",
        options: [],
      },
    ],
    onDeleteConfirm: onDeleteConfirm,
    fetchData: fecthData,
    fetchFilters: fecthFilters,
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
        message="¿Estás seguro de que deseas eliminar esta mallas? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        color="error"
        onConfirm={() => {
          handleDeleteConfirm();
        }}
        onClose={() => handleDelete(null)}
      />
      <TopCrud
        newUrl={APP_ROUTES.mallas.subRoutes.mallas_create.path}
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
        <Table<Malla>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading || actionLoading}
          rows={data as Malla[]}
          total={total}
          columns={columns((row) => {
            handleEdit(
              `${APP_ROUTES.mallas.subRoutes.mallas_edit.path(
                row.id.toString()
              )}`
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
  handleEdit: (row: Malla) => void,
  handleDelete: (row: Malla) => void
): Column<Malla>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 20,
  },
  {
    id: "art_codigo",
    width: 180,
    label: "Código Artículo",
    align: "left",
    sortable: false,
  },
  {
    id: "codigo",
    width: 200,
    label: "Malla",
    align: "left",
    sortable: false,
  },
  {
    id: "activo",
    label: "Activo",
    align: "center",
    width: 110,
    format: (row) => {
      return (
        <Chip
          color={row.activo ? "success" : "error"}
          label={row.activo ? "Activo" : "Inactivo"}
        />
      );
    },
  },
  {
    id: "diametro",
    label: "Diámetro (mm)",
    width: 180,
    align: "center",
    sortable: true,
  },
  {
    id: "largo",
    label: "Largo (mm)",
    width: 140,
    align: "center",
    sortable: true,
  },
  {
    id: "ancho",
    label: "Ancho (mm)",
    width: 150,
    align: "center",
    sortable: true,
  },
  {
    id: "longitudinales",
    label: "No.Longs",
    width: 140,
    align: "center",
    sortable: true,
  },
  {
    id: "transversales",
    label: "No.Trans",
    width: 140,
    align: "center",
    sortable: true,
  },
  {
    id: "fecha",
    label: "FECHA CREACIÓN",
    width: 150,
    align: "center",
    format: (row) => new Date(row.creado).toLocaleDateString("es-ES"),
  },
  {
    id: "action_id",
    label: "ACCIONES",
    width: 180,
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
        <Tooltip title="Editar malla" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar malla" arrow placement="top">
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
