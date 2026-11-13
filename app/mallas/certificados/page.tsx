"use client";

import React from "react";
import useDataTable, { TableFilter } from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import ProtectedRoute from "@/components/commons/ProtectedRoute";

interface CertificadoRow {
  id: number;
  certificado: string;
  imagen: string | null;
  creado: string;
}

export default function CertificadosMallasPage() {
  const permission = APP_ROUTES.mallas.subRoutes.certificados
    ?.permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <CertificadosMallasView />
    </ProtectedRoute>
  );
}

export function CertificadosMallasView() {
  const fetchData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[]
  ): Promise<{ data: CertificadoRow[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.mallas.certificados,
      window.location.origin
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
    if (!response.ok) throw new Error("Error al consultar los certificados");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: CertificadoRow) => ({
          ...item,
        })) as CertificadoRow[]) || [],
      total: result.total || 0,
    };
  };

  const onDeleteConfirm = async (
    id: string | number
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(
        `${APP_ROUTES.api.mallas.certificados}/${String(id)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Error al eliminar el certificado");
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar certificado:", error);
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
  } = useDataTable({
    initFilters: [], // Sin filtros adicionales, solo barra de búsqueda
    onDeleteConfirm: onDeleteConfirm,
    fetchData: fetchData,
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
        message="¿Estás seguro de que deseas eliminar este certificado? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        color="error"
        onConfirm={() => {
          handleDeleteConfirm();
        }}
        onClose={() => handleDelete(null)}
      />
      <TopCrud
        newUrl={APP_ROUTES.mallas.subRoutes.certificados_create?.path || "#"}
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
      />
      <Box sx={{ height: "calc(100vh - 225px)", overflow: "hidden", mt: 2 }}>
        <Table<CertificadoRow>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading || actionLoading}
          rows={data as CertificadoRow[]}
          total={total}
          columns={columns((row) => {
            handleEdit(
              APP_ROUTES.mallas.subRoutes.certificados_edit?.path(
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
  handleEdit: (row: CertificadoRow) => void,
  handleDelete: (row: CertificadoRow) => void
): Column<CertificadoRow>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 60,
  },
  {
    id: "certificado",
    width: 280,
    label: "Certificado",
    align: "left",
    sortable: true,
    format: (row) => (
      <Typography variant="body2" sx={{ fontWeight: "bold" }}>
        {row.certificado}
      </Typography>
    ),
  },
  {
    id: "imagen" as keyof CertificadoRow,
    width: 150,
    label: "Imagen",
    align: "center",
    sortable: false,
    format: (row) =>
      row.imagen ? (
        <Box
          component="img"
          src={`${APP_ROUTES.api.mallas.certificados_imagen(
            row.id
          )}?v=${encodeURIComponent(row.imagen)}`}
          alt={`Certificado ${row.certificado}`}
          sx={{ width: 40, height: 40, objectFit: "cover", borderRadius: 1 }}
        />
      ) : (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Sin imagen
        </Typography>
      ),
  },
  {
    id: "creado",
    width: 180,
    label: "Creado",
    align: "center",
    sortable: true,
    format: (row) => {
      if (!row.creado) return "";

      const date = new Date(row.creado);
      if (Number.isNaN(date.getTime())) return row.creado;

      return date.toLocaleString("es-ES", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      });
    },
  },
  {
    id: "action_id" as keyof CertificadoRow,
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
        <Tooltip title="Editar certificado" arrow placement="top">
          <IconButton
            size="small"
            onClick={() => handleEdit(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <Edit2 size={16} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Eliminar certificado" arrow placement="top">
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
