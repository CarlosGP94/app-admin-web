"use client";

import React from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton, Typography, Stack } from "@mui/material";
import { Eye, Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";

interface Prod {
  id: number;
  tubo: string;
  lote: string;
  turno_prefijo: string;
  operario: string;
  maquinas: { id: number; maquina: string }[];
  tubos_buenos: number;
  tubos_malos: number;
  paquetes: number;
  paquete_incompleto: number;
  action_id: number;
  fecha: string;
}

export default function ProduccionPage() {
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
    console.log("result", result);
    return {
      //   fabricante: result.data.fabricantes.map((f: Fabricante) => ({
      //     label: f.nombre,
      //     value: f.id,
      //   })),
      //   colada: result.data.coladas.map((c: Colada) => ({
      //     label: c.colada,
      //     value: c.id,
      //   })),
      //   creado: [
      //     {
      //       label: "limitStart",
      //       value: result.data.rangoFechas.minFecha || null,
      //     },
      //     {
      //       label: "limitEnd",
      //       value: result.data.rangoFechas.maxFecha || null,
      //     },
      //   ],
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
    handleDetail,
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
          sortModel={sortModel}
          onSortModelChange={handleSortModel}
          page={page}
          loading={loading}
          rows={data as Prod[]}
          total={total}
          columns={columns(handleDetail, handleEdit, handleDelete)}
          rowKeyExtractor={(row) => row.id}
          handlePageChange={handlePageChange}
        />
      </Box>
    </Box>
  );
}

const columns = (
  handleDetail: (row: Prod) => void,
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
        <IconButton
          size="small"
          onClick={() => handleDetail(row)}
          sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
        >
          <Eye size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleEdit(row)}
          sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
        >
          <Edit2 size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleDelete(row)}
          sx={{ color: "#64748b", "&:hover": { color: "#ef4444" } }}
        >
          <Trash2 size={16} />
        </IconButton>
      </Box>
    ),
  },
];
