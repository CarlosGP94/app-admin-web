"use client";

import React, { useState } from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES, PERMISOS } from "@/config/routes";
import { Box, IconButton, Typography, Button } from "@mui/material";
import { Eye, Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import { tienePermiso } from "@/utils/functions";
import { useAuth } from "@/context/AuthContext";
import { InformeSalidaModal } from "@/components/tubos/salidaPaquetes/InformeSalidaModal";

interface Prod {
  id: number;
  tubo: string;
  num_paqs: number;
  resto: number;
  operario: string;
  action_id: number;
  fecha: string;
}

interface Calidad {
  id: number;
  calidad: string;
}

interface Operario {
  id: number;
  nombre: string;
}

export default function SalidaPaqsPage() {
  const permission = APP_ROUTES.tubos.subRoutes.salida_paquetes
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <SalidaPaqsView />
    </ProtectedRoute>
  );
}

export function SalidaPaqsView() {
  const { user } = useAuth();

  // Estado para controlar el modal de informe
  const [openInformeModal, setOpenInformeModal] = useState<boolean>(false);
  const [loadingInforme, setLoadingInforme] = useState<boolean>(false);

  const userPermissions = user?.permisos || [];
  const informePermission = tienePermiso(
    userPermissions,
    PERMISOS.tubos.salida_paquetes.informe,
  );

  const handleGenerarInforme = async (fechas: {
    fechaInicio: string;
    fechaFin: string;
  }) => {
    try {
      setLoadingInforme(true);

      const response = await fetch(
        APP_ROUTES.api.tubos.salida_paquetes_informe,
        {
          method: "POST", // 👈 Especificamos el método POST
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fechaInicio: fechas.fechaInicio,
            fechaFin: fechas.fechaFin,
          }), // 👈 Enviamos los parámetros en el body
        },
      );

      if (!response.ok) throw new Error("Error al generar el informe");

      // Recibimos el archivo PDF desde el backend
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `informe_salida_paquetes_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      setOpenInformeModal(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInforme(false);
    }
  };

  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: Prod[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.tubos.salida_paquetes,
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
      throw new Error("Error al consultar la salida de paquetes");

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
      APP_ROUTES.api.tubos.salida_paquetes_filtros,
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
      operario: result.data.operarios.map((o: Operario) => ({
        label: o.nombre,
        value: o.id,
      })),
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

  const {
    page,
    total,
    data,
    searchTerm,
    filters,
    loadingFilters,
    loading,
    sortModel,
    handleSortModel,
    handlePageChange,
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
        name: "operario",
        label: "Operario",
        type: "select",
        value: null,
        defaultLabel: "Todos los operarios",
        options: [],
      },
      {
        name: "creado",
        label: "Fecha de corte",
        type: "daterangeStart",
        valueStart: null,
        valueEnd: null,
      },
    ],
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
      <TopCrud
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
        actions={[
          <Box key="new-tubo">
            {informePermission && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setOpenInformeModal(true)}
              >
                Informe Salida de Paquetes
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
        <Table<Prod>
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading}
          rows={data as Prod[]}
          total={total}
          columns={columns()}
          rowKeyExtractor={(row) => row.id}
          handlePageChange={handlePageChange}
        />
      </Box>

      {/* Modal de selección de rango de fechas */}
      <InformeSalidaModal
        open={openInformeModal}
        onClose={() => setOpenInformeModal(false)}
        onConfirm={handleGenerarInforme}
        loading={loadingInforme}
      />
    </Box>
  );
}

const columns = (): Column<Prod>[] => [
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
  },
  {
    id: "operario",
    label: "Operario",
    align: "left",
    sortable: true,
  },
  {
    id: "num_paqs",
    width: 200,
    label: "Paquetes / Resto (uds)",
    align: "center",
    format: (row) => (
      <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: "info.main", fontWeight: "bold" }}
        >
          {row.num_paqs}
        </Typography>
        <span>/</span>
        <Typography
          variant="body2"
          sx={{ color: "secondary.main", fontWeight: "bold" }}
        >
          {row.resto}
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
];
