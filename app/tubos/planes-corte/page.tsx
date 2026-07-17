"use client";

import React from "react";
import useDataTable, { FilterOption, TableFilter } from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton } from "@mui/material";
import { Eye, Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";

interface PlanCorte {
  id: number;
  ancho_estipulado: number;
  action_id: number;
  fecha: string;
}

export default function PlanesCortePage() {
  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: PlanCorte[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.tubos.planes_corte,
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
    if (!response.ok) throw new Error("Error al consultar los planes de corte");

    const result = await response.json();

    return {
      data:
        (result.data.map((item: PlanCorte) => ({
          ...item,
          action_id: item.id,
        })) as PlanCorte[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (): Promise<
    Record<string, (string | number | FilterOption)[]>
  > => {
    const response = await fetch(APP_ROUTES.api.tubos.planes_corte_anchos);
    if (!response.ok) throw new Error("Error al consultar los planes de corte");
    const result = await response.json();
    return {
      ancho_estipulado: result.data.map((item: string) => ({
        value: item,
        label: item,
      })),
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
        name: "ancho_estipulado",
        label: "Ancho",
        type: "select",
        value: 0,
        defaultLabel: "Todos los anchos",
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
      <Table<PlanCorte>
        sortModel={sortModel}
        onSortModelChange={handleSortModel}
        page={page}
        loading={loading}
        rows={data as PlanCorte[]}
        total={total}
        columns={columns(handleDetail, handleEdit, handleDelete)}
        rowKeyExtractor={(row) => row.id}
        handlePageChange={handlePageChange}
      />
    </Box>
  );
}

const columns = (
  handleDetail: (row: PlanCorte) => void,
  handleEdit: (row: PlanCorte) => void,
  handleDelete: (row: PlanCorte) => void,
): Column<PlanCorte>[] => [
  {
    id: "id",
    label: "Plan",
    align: "left",
    sortable: true,
  },
  {
    id: "ancho_estipulado",
    label: "Ancho (mm)",
    align: "left",
    sortable: true,
  },
  {
    id: "fecha",
    label: "FECHA CREACIÓN",
    width: 150,
    align: "center",
    format: (value) => new Date(value).toLocaleDateString("es-ES"),
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
          onClick={() => handleDetail(row as unknown as PlanCorte)}
          sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
        >
          <Eye size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleEdit(row as unknown as PlanCorte)}
          sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
        >
          <Edit2 size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleDelete(row as unknown as PlanCorte)}
          sx={{ color: "#64748b", "&:hover": { color: "#ef4444" } }}
        >
          <Trash2 size={16} />
        </IconButton>
      </Box>
    ),
  },
];
