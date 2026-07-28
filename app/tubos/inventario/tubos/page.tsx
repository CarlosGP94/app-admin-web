"use client";

import React from "react";
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
} from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { tienePermiso } from "@/utils/functions";

interface Tubo {
  id: number;
  art_concepto: string;
  activo: boolean;
  peso_unitario: number;
  peso_total: number;
  num_paquetes: number;
  num_por_paq: number;
  resto: number;
  unidades: number;
  alto_paq: number;
  ancho_paq: number;
  action_id: number;
  fecha: string;
}

interface Calidad {
  id: number;
  nombre: string;
}

interface Tipo {
  id: number;
  nombre: string;
}

export default function TubosPage() {
  const permission = APP_ROUTES.tubos.subRoutes.tubos
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
  const { user } = useAuth();

  const userPermissions = user?.permisos || [];
  const informeInventarioPermission = tienePermiso(
    userPermissions,
    PERMISOS.tubos.tubos.informe,
  );

  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: Tubo[]; total: number }> => {
    const url = new URL(APP_ROUTES.api.tubos.tubos, window.location.origin);

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
    if (!response.ok) throw new Error("Error al consultar los tubos");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: Tubo) => ({
          ...item,
        })) as Tubo[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (
    currentFilters: CurrentFilter[],
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.tubos.tubos_filtros,
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
    if (!response.ok) throw new Error("Error al consultar los tubos");
    const result = await response.json();
    return {
      calidad: result.data.calidades.map((c: Calidad) => ({
        label: c.nombre,
        value: c.id,
      })),
      tipo: result.data.tipos.map((t: Tipo) => ({
        label: t.nombre,
        value: t.id,
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
      const response = await fetch(APP_ROUTES.api.tubos.tubos_informe, {
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
            "Error al generar el informe de tubos.",
        );
      }

      // Extraer el nombre del archivo si la API envía la cabecera Content-Disposition
      const contentDisposition = response.headers.get("Content-Disposition");
      let fileName = "informe_tubos.pdf";
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
      await fetch(APP_ROUTES.api.tubos.tubos_detalle(String(id)), {
        method: "DELETE",
      });
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar el tubo:", error);
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
        name: "calidad",
        label: "Calidad",
        type: "select",
        value: null,
        defaultLabel: "Todas las calidades",
        options: [],
      },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        value: null,
        defaultLabel: "Todos los tipos",
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
        newUrl={APP_ROUTES.tubos.subRoutes.tubos_create.path}
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
        actions={[
          <Box key="new-tubo">
            {informeInventarioPermission && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => onGenerateReport()}
              >
                Informe Inventario
              </Button>
            )}
          </Box>,
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
        <Table<Tubo>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading || actionLoading}
          rows={data as Tubo[]}
          total={total}
          columns={columns((row) => {
            handleEdit(
              `${APP_ROUTES.tubos.subRoutes.tubos_edit.path(row.id.toString())}`,
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
  handleEdit: (row: Tubo) => void,
  handleDelete: (row: Tubo) => void,
): Column<Tubo>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 20,
  },
  {
    id: "art_concepto",
    minWidth: 200,
    label: "Tubo",
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
    id: "num_paquetes",
    label: "Cant. Paqs",
    width: 250,
    align: "center",
    sortable: true,
  },
  {
    id: "peso_total",
    label: "Peso Unit / Total (Kg)",
    width: 220,
    align: "center",
    sortable: true,
    format: (row) => (
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: "info.main", fontWeight: "bold" }}
        >
          {row?.peso_unitario?.toFixed(2) ?? "0.00"}
        </Typography>
        <span>/</span>
        <Typography
          variant="body2"
          sx={{ color: "secondary.main", fontWeight: "bold" }}
        >
          {row?.peso_total?.toFixed(2) ?? "0.00"}
        </Typography>
      </Box>
    ),
  },

  {
    id: "alto_paq",
    label: "Alto / Ancho Paquete (mm)",
    width: 260,
    align: "center",
    sortable: true,
    format: (row) => (
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: "info.main", fontWeight: "bold" }}
        >
          {row.alto_paq}
        </Typography>
        <span>/</span>
        <Typography
          variant="body2"
          sx={{ color: "secondary.main", fontWeight: "bold" }}
        >
          {row.ancho_paq}
        </Typography>
      </Box>
    ),
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
        <Tooltip title="Editar tubo" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar tubo" arrow placement="top">
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
