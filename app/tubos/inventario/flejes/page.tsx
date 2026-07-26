"use client";

import React from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton, Chip, Tooltip, Button } from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface Fleje {
  id: number;
  concepto: string;
  calidad: string;
  activo: boolean;
  peso_medio: number;
  unidades: number;
  action_id: number;
  fecha: string;
}

interface Calidad {
  id: number;
  nombre: string;
}

export default function FlejesPage() {
  const permission = APP_ROUTES.tubos.subRoutes.flejes
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <FlejesView />
    </ProtectedRoute>
  );
}

export function FlejesView() {
  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: Fleje[]; total: number }> => {
    const url = new URL(APP_ROUTES.api.tubos.flejes, window.location.origin);

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
            String(filter.valueStart),
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
    if (!response.ok) throw new Error("Error al consultar los flejes");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: Fleje) => ({
          ...item,
        })) as Fleje[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (
    currentFilters: CurrentFilter[],
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.tubos.flejes_filtros,
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
    if (!response.ok) throw new Error("Error al consultar las bobinas");
    const result = await response.json();

    return {
      calidad: result.data.calidades.map((c: Calidad) => ({
        label: c.nombre,
        value: c.id,
      })),
      espesor: result.data.espesores.map((e: number) => ({
        label: e.toString(),
        value: e,
      })),
    };
  };

  const onGenerateReport = async (): Promise<{
    success: boolean;
    error?: string;
  }> => {
    let objectUrl: string | null = null;

    try {
      const response = await fetch(APP_ROUTES.api.tubos.flejes_informe, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        // Intentamos parsear el JSON de error que devuelve el endpoint
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al generar el informe de flejes.",
        );
      }

      // Extraer el nombre del archivo si la API envía la cabecera Content-Disposition
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = "informe_flejes.pdf";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          fileName = match[1];
        }
      }

      // Convertir a Blob y forzar la descarga en el navegador
      const blob = await response.blob();
      objectUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true };
    } catch (error) {
      console.error("Error al generar el informe:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al procesar el archivo.";

      return { success: false, error: message };
    } finally {
      // Liberar memoria del navegador
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const onDeleteConfirm = async (
    id: string | number,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await fetch(APP_ROUTES.api.tubos.flejes_detalle(String(id)), {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar el fleje:", error);
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
    showDeleteConfirm,
    handleSortModel,
    handlePageChange,
    handleEdit,
    handleDelete,
    handleFilterChange,
    handleClearAllFilters,
    handleFilter,
    handleDeleteConfirm,
  } = useDataTable({
    initFilters: [
      {
        name: "calidad",
        label: "Calidad",
        type: "select",
        value: null,
        defaultLabel: "Todas las calidades",
        options: [],
      },
      {
        name: "espesor",
        label: "Espesor",
        type: "select",
        value: null,
        defaultLabel: "Todos los espesores",
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
        newUrl={APP_ROUTES.tubos.subRoutes.flejes_create.path}
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
        actions={[
          <Button
            key="new-tubo"
            variant="contained"
            color="primary"
            onClick={() => onGenerateReport()}
          >
            Informe Inventario
          </Button>,
        ]}
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
        <Table<Fleje>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading}
          rows={data as Fleje[]}
          total={total}
          columns={columns((row) => {
            console.log("Editando fleje con ID:", row.id);
            handleEdit(
              `${APP_ROUTES.tubos.subRoutes.flejes_edit.path(row.id.toString())}`,
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
  handleEdit: (row: Fleje) => void,
  handleDelete: (row: Fleje) => void,
): Column<Fleje>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 20,
  },
  {
    id: "concepto",
    minWidth: 200,
    label: "Fleje",
    align: "left",
    sortable: true,
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
    id: "unidades",
    label: "Unidades",
    width: 100,
    align: "center",
    sortable: true,
  },
  {
    id: "peso_medio",
    label: "Peso Medio (Tn)",
    width: 200,
    align: "center",
    sortable: true,
  },
  {
    id: "fecha",
    label: "FECHA CREACIÓN",
    width: 150,
    align: "center",
    format: (row) => new Date(row.fecha).toLocaleDateString("es-ES"),
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
        <Tooltip title="Editar fleje" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar fleje" arrow placement="top">
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
