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
  Typography,
  Stack,
  Button,
  Tooltip,
} from "@mui/material";
import { Edit2, Trash2, PencilRuler } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import FormatListBulletedAddIcon from "@mui/icons-material/FormatListBulletedAdd";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { ConfirmDialog } from "@/components/commons/ConfirmDialog";
import { ListAlt } from "@mui/icons-material";
import { ExcelAuditoriaModal } from "@/components/tubos/produccion/ExcelAuditoriaModal";
import { tienePermiso } from "@/utils/functions";

interface Prod {
  id: number;
  tubo: string;
  lote: string;
  turno_prefijo: string;
  operario: string;
  control_dimensional_id: number | null;
  maquinas: { id: number; maquina: string }[];
  tubos_buenos: number;
  tubos_malos: number;
  paquetes: number;
  paquete_incompleto: number;
  action_id: number;
  fecha: string;
}

interface Calidad {
  id: number;
  calidad: string;
}

interface Maquina {
  id: number;
  maquina: string;
}

interface Turno {
  id: number;
  prefijo: string;
}

export default function ProduccionPage() {
  const permission = APP_ROUTES.tubos.subRoutes.produccion
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <ProduccionView />
    </ProtectedRoute>
  );
}

export function ProduccionView() {
  const { user } = useAuth();
  const userPermissions = user?.permisos || [];
  const informePermission = tienePermiso(
    userPermissions,
    PERMISOS.tubos.produccion.auditoria,
  );
  const coladasPermission = tienePermiso(
    userPermissions,
    APP_ROUTES.tubos.subRoutes.produccion_coladas.permission,
  );

  const [openExcelModal, setOpenExcelModal] = useState<boolean>(false);
  const [loadingExcel, setLoadingExcel] = useState<boolean>(false);
  const router = useRouter();
  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: Prod[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.tubos.produccion,
      window.location.origin,
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
    if (!response.ok)
      throw new Error("Error al consultar la producción de tubos");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: Prod) => ({
          ...item,
        })) as Prod[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (
    currentFilters: CurrentFilter[],
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.tubos.produccion_filtros,
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
    if (!response.ok)
      throw new Error("Error al consultar las productos de tubos");
    const result = await response.json();

    return {
      calidad: result.data.calidades.map((f: Calidad) => ({
        label: f.calidad,
        value: f.id,
      })),
      maquina: result.data.maquinas.map((c: Maquina) => ({
        label: c.maquina,
        value: c.id,
      })),
      turno: result.data.turnos.map((t: Turno) => ({
        label: t.prefijo,
        value: t.id,
      })),
      operario: result.data.operarios.map(
        (o: { id: number; nombre: string }) => ({
          label: o.nombre,
          value: o.id,
        }),
      ),
      espesor: result.data.espesores.map((e: number) => ({
        label: String(e),
        value: e,
      })),
      estructural: [
        result.data.estructural.si ? { label: "SI", value: 1 } : null,
        result.data.estructural.no ? { label: "NO", value: 2 } : null,
      ].filter(Boolean) as FilterOption[],
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
      await fetch(APP_ROUTES.api.tubos.produccion_detalle(String(id)), {
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
    selectedIds,
    showDeleteConfirm,
    handleSortModel,
    handlePageChange,
    handleEdit,
    handleDelete,
    handleFilterChange,
    handleClearAllFilters,
    handleFilter,
    handleSelectItems,
    handleDeleteConfirm,
  } = useDataTable({
    initFilters: [
      {
        name: "calidad",
        label: "Calidad",
        type: "select",
        value: 0,
        defaultLabel: "Todas las calidad",
      },
      {
        name: "maquina",
        label: "Máquina",
        type: "select",
        value: 0,
        defaultLabel: "Todas las máquinas",
      },
      {
        name: "operario",
        label: "Operario",
        type: "select",
        value: 0,
        defaultLabel: "Todos los operarios",
      },
      {
        name: "turno",
        label: "Turno",
        type: "select",
        value: 0,
        defaultLabel: "Todos los turnos",
      },
      {
        name: "espesor",
        label: "Espesor",
        type: "select",
        value: 0,
        defaultLabel: "Todos los espesores",
      },
      {
        name: "estructural",
        label: "Estructural",
        type: "select",
        value: 0,
        defaultLabel: "Ninguna",
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

  const handleGenerarExcelAuditoria = async (fechas: {
    fechaInicio: string;
    fechaFin: string;
  }) => {
    try {
      setLoadingExcel(true);

      // 1. Construimos los query params para la petición GET
      const params = new URLSearchParams({
        fechaInicio: fechas.fechaInicio,
        fechaFin: fechas.fechaFin,
      });

      const response = await fetch(
        `${APP_ROUTES.api.tubos.produccion_auditoria}?${params.toString()}`,
        {
          method: "GET",
        },
      );

      // 2. Si la respuesta falla, extraemos el mensaje de error devuelto por la API
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || "Error al generar el Excel de auditoría",
        );
      }

      // 3. Descarga del archivo binario (Blob)
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `auditoria_produccion_${fechas.fechaInicio}_${fechas.fechaFin}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setOpenExcelModal(false);
      toast.success("Excel generado correctamente");
    } catch (error: unknown) {
      console.error(error);
      toast.error(
        ((error as Error)?.message as string) ||
          "Hubo un problema al generar el reporte en Excel",
      );
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleCDimensional = (row: Prod) => {
    if (!row.control_dimensional_id) {
      toast.error("No hay control dimensional asociado a esta producción.");
      return;
    }
    router.push(
      `${APP_ROUTES.tubos.subRoutes.produccion_control_dimensional.path(row.id.toString())}`,
    );
  };

  const handleInsertarColadas = () => {
    if (selectedIds.length === 0) return;

    const idsQuery = selectedIds.join(",");

    router.push(
      `${APP_ROUTES.tubos.subRoutes.produccion_coladas.path}?ids=${idsQuery}`,
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
        message="¿Estás seguro de que deseas eliminar este tubo? Se restaurará el inventario del tubo correspondiente y esta acción no se puede deshacer."
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
            {coladasPermission && (
              <Button
                disabled={selectedIds.length === 0}
                onClick={handleInsertarColadas}
                startIcon={<FormatListBulletedAddIcon fontSize="small" />}
                sx={{ minWidth: "120px" }}
                color="primary"
                size="small"
                variant="contained"
              >
                Insertar Coladas Auditoría ({selectedIds.length})
              </Button>
            )}

            {informePermission && (
              <Button
                onClick={() => setOpenExcelModal(true)}
                startIcon={<ListAlt fontSize="small" />}
                sx={{ minWidth: "120px" }}
                color="primary"
                size="small"
                variant="contained"
              >
                Generar Excel Auditoría
              </Button>
            )}
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
      <Box sx={{ height: "calc(100vh - 370px)", overflow: "hidden" }}>
        <Table<Prod>
          selectable
          selectedIds={selectedIds}
          onSelectionChange={handleSelectItems}
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading}
          rows={data as Prod[]}
          total={total}
          columns={columns(
            handleCDimensional,
            (row) => {
              handleEdit(
                `${APP_ROUTES.tubos.subRoutes.produccion_edit.path(row.id.toString())}`,
              );
            },
            handleDelete,
          )}
          rowKeyExtractor={(row) => row.id}
          handlePageChange={handlePageChange}
        />
      </Box>
      <ExcelAuditoriaModal
        open={openExcelModal}
        onClose={() => setOpenExcelModal(false)}
        onConfirm={handleGenerarExcelAuditoria}
        loading={loadingExcel}
      />
    </Box>
  );
}

const columns = (
  handleCDimensional: (row: Prod) => void,
  handleEdit: (row: Prod) => void,
  handleDelete: (row: Prod) => void,
): Column<Prod>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 20,
  },
  {
    id: "tubo",
    minWidth: 200,
    label: "Tubo",
    align: "left",
    sortable: true,
    format: (row) => (
      <Box>
        <Typography variant="body2">{row.tubo}</Typography>
        <Stack sx={{ flexDirection: "row", gap: 0.5, flexWrap: "wrap" }}>
          {row.maquinas.map((m, index) => (
            <Typography
              key={m.id}
              variant="body2"
              sx={{ color: "text.secondary" }}
            >
              {m.maquina}
              {index < row.maquinas.length - 1 ? "," : ""}
            </Typography>
          ))}
        </Stack>
      </Box>
    ),
  },
  {
    id: "lote",
    width: 120,
    label: "Lote",
    align: "left",
    sortable: true,
  },
  {
    id: "turno_prefijo",
    width: 80,
    label: "Turno",
    align: "center",
  },
  {
    id: "operario",
    label: "Operario",
    align: "left",
    sortable: true,
  },
  {
    id: "tubos_buenos",
    width: 220,
    label: "Tubos Buenos / Malos",
    align: "center",
    format: (row) => (
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: "success.main", fontWeight: "bold" }}
        >
          {row.tubos_buenos}
        </Typography>
        <span>/</span>
        <Typography
          variant="body2"
          sx={{ color: "error.main", fontWeight: "bold" }}
        >
          {row.tubos_malos}
        </Typography>
      </Box>
    ),
  },
  {
    id: "paquetes",
    width: 200,
    label: "Paquetes / Resto (uds)",
    align: "center",
    format: (row) => (
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: "info.main", fontWeight: "bold" }}
        >
          {row.paquetes}
        </Typography>
        <span>/</span>
        <Typography
          variant="body2"
          sx={{ color: "secondary.main", fontWeight: "bold" }}
        >
          {row.paquete_incompleto}
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
        <Tooltip title="Control Dimensional" arrow placement="top">
          <IconButton
            disabled={!row.control_dimensional_id}
            size="small"
            onClick={() => handleCDimensional(row)}
            sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
          >
            <PencilRuler size={16} />
          </IconButton>
        </Tooltip>
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
