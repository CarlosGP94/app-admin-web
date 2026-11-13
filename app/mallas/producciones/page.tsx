"use client";

import React, { useState } from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES, PERMISOS } from "@/config/routes";
import { Box, Button, IconButton, Tooltip } from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import ListAlt from "@mui/icons-material/ListAlt";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { tienePermiso } from "@/utils/functions";
import { toast } from "react-toastify";
import {
  ExcelProduccionModal,
  ExcelProduccionFiltros,
  ExcelProduccionMaquina,
} from "@/components/mallas/producciones/ExcelProduccionModal";

interface ExcelOpciones {
  maquinas: ExcelProduccionMaquina[];
  diametros: number[];
  rangoFechas: {
    minFecha: string | null;
    maxFecha: string | null;
  };
}

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
  const { user } = useAuth();
  const excelPermission = tienePermiso(
    user?.permisos || [],
    PERMISOS.mallas.producciones.excel
  );

  const [openExcelModal, setOpenExcelModal] = useState<boolean>(false);
  const [loadingExcel, setLoadingExcel] = useState<boolean>(false);
  const [loadingExcelOptions, setLoadingExcelOptions] =
    useState<boolean>(false);
  const [excelOptions, setExcelOptions] = useState<ExcelOpciones | null>(null);

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
      maquina_id: (data.maquinas || []).map(
        (m: { id: number; maquina: string }) => ({
          value: m.id,
          label: m.maquina,
        })
      ),
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

  const handleOpenExcelModal = async () => {
    try {
      setLoadingExcelOptions(true);

      const response = await fetch(APP_ROUTES.api.mallas.producciones_filtros);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "No se pudieron cargar las opciones del informe."
        );
      }

      const result = await response.json();
      const data = result.data || {};

      setExcelOptions({
        maquinas: data.maquinas || [],
        diametros: data.diametros || [],
        rangoFechas: data.rangoFechas || {
          minFecha: null,
          maxFecha: null,
        },
      });
      setOpenExcelModal(true);
    } catch (error) {
      console.error("Error al cargar las opciones del informe:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al cargar las opciones del informe."
      );
    } finally {
      setLoadingExcelOptions(false);
    }
  };

  const handleGenerarExcel = async (filtros: ExcelProduccionFiltros) => {
    try {
      setLoadingExcel(true);

      const params = new URLSearchParams();

      filtros.maquina_ids.forEach((id) =>
        params.append("maquina_id", String(id))
      );
      filtros.diametros.forEach((diametro) =>
        params.append("diametro", String(diametro))
      );
      params.set("fechaInicio", filtros.fechaInicio);
      params.set("fechaFin", filtros.fechaFin);

      const response = await fetch(
        `${APP_ROUTES.api.mallas.producciones_excel}?${params.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            errorData.message ||
            "Error al generar el Excel de producción."
        );
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `produccion_mallas_${filtros.fechaInicio}_${filtros.fechaFin}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setOpenExcelModal(false);
      toast.success("Excel generado correctamente.");
    } catch (error) {
      console.error("Error al generar el Excel de producción:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Hubo un problema al generar el informe en Excel."
      );
    } finally {
      setLoadingExcel(false);
    }
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
        actions={
          excelPermission ? (
            <Button
              onClick={handleOpenExcelModal}
              disabled={loadingExcelOptions}
              startIcon={<ListAlt fontSize="small" />}
              sx={{ minWidth: "120px" }}
              color="primary"
              size="small"
              variant="contained"
            >
              {loadingExcelOptions ? "Cargando..." : "Generar Excel"}
            </Button>
          ) : null
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
      {openExcelModal && excelOptions && (
        <ExcelProduccionModal
          open
          onClose={() => setOpenExcelModal(false)}
          onConfirm={handleGenerarExcel}
          loading={loadingExcel}
          maquinas={excelOptions.maquinas}
          diametros={excelOptions.diametros}
          rangoFechas={excelOptions.rangoFechas}
        />
      )}
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
    format: (row) => {
      const mallaId = Number(row.malla_id);
      if (!row.malla_id || mallaId === 0) return "-";
      return row.malla_codigo || `Malla #${row.malla_id}`;
    },
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
    width: 180,
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
