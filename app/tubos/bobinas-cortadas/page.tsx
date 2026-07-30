"use client";

import React, { useState } from "react";
import useDataTable, {
  CurrentFilter,
  FilterOption,
  TableFilter,
} from "@/hooks/useDataTable";
import { APP_ROUTES } from "@/config/routes";
import { Box, IconButton, Button } from "@mui/material";
import { Edit2, Trash2 } from "lucide-react";
import Table, { Column } from "@/components/commons/Table";
import DataFilters from "@/components/commons/DataFilters";
import TopCrud from "@/components/commons/TopCrud";
import ProtectedRoute from "@/components/commons/ProtectedRoute";
import FormatListBulletedAddIcon from "@mui/icons-material/FormatListBulletedAdd";
import { AsignarColadaModal } from "@/components/tubos/bobinasCortadas/AsignarColadaModal";
import { toast } from "react-toastify";

interface BobinaCortada {
  id: number;
  bobina_concepto: string;
  colada: string;
  turno_prefijo: string;
  operario: string;
  action_id: number;
  fecha: string;
  fabricante_id: number; // 👈 Añadido para la validación
  calidad_id: number; // 👈 Añadido para la validación
}

interface Fabricante {
  id: number;
  nombre: string;
}

interface Colada {
  id: number;
  colada: string;
}

export default function BobinaCortadaPage() {
  const permission = APP_ROUTES.tubos.subRoutes.bobinas_cortadas
    .permission as React.ComponentProps<
    typeof ProtectedRoute
  >["requiredPermission"];

  return (
    <ProtectedRoute requiredPermission={permission}>
      <BobinaCortadaView />
    </ProtectedRoute>
  );
}

export function BobinaCortadaView() {
  // Estados para controlar el modal y el loader
  const [openColadaModal, setOpenColadaModal] = useState<boolean>(false);
  const [loadingColada, setLoadingColada] = useState<boolean>(false);

  const fecthData = async (
    currentPage: number,
    currentPageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ): Promise<{ data: BobinaCortada[]; total: number }> => {
    const url = new URL(
      APP_ROUTES.api.tubos.bobinas_cortadas,
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
      throw new Error("Error al consultar las bobinas cortadas");

    const result = await response.json();
    return {
      data:
        (result.data.map((item: BobinaCortada) => ({
          ...item,
        })) as BobinaCortada[]) || [],
      total: result.total || 0,
    };
  };

  const fecthFilters = async (
    currentFilters: CurrentFilter[],
  ): Promise<Record<string, (string | number | FilterOption)[]>> => {
    const url = new URL(
      APP_ROUTES.api.tubos.bobinas_cortadas_filtros,
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
      throw new Error("Error al consultar las bobinas cortadas");
    const result = await response.json();
    return {
      fabricante: result.data.fabricantes.map((f: Fabricante) => ({
        label: f.nombre,
        value: f.id,
      })),
      colada: result.data.coladas.map((c: Colada) => ({
        label: c.colada,
        value: c.id,
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
    selectedIds,
    handleSortModel,
    handlePageChange,
    handleSelectItems,
    handleEdit,
    handleDelete,
    handleFilterChange,
    handleClearAllFilters,
    handleFilter,
  } = useDataTable({
    initFilters: [
      {
        name: "fabricante",
        label: "Fabricante",
        type: "select",
        value: 0,
        defaultLabel: "Todos los fabricantes",
      },
      {
        name: "colada",
        label: "Colada",
        type: "select",
        value: 0,
        defaultLabel: "Todas las coladas",
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

  // Handler con la validación requerida
  const handleInsertarColadas = () => {
    if (selectedIds.length === 0) return;

    // Obtener los objetos completos de las bobinas seleccionadas
    const selectedBobinas = (data as BobinaCortada[]).filter((b) =>
      selectedIds.includes(b.id),
    );

    // Si hay 2 o más seleccionadas, validamos fabricante y calidad
    if (selectedBobinas.length >= 2) {
      const primerFabricante = selectedBobinas[0].fabricante_id;
      const primeraCalidad = selectedBobinas[0].calidad_id;

      const tieneDistintoFabricanteOCalidad = selectedBobinas.some(
        (b) =>
          b.fabricante_id != primerFabricante || b.calidad_id != primeraCalidad,
      );

      if (tieneDistintoFabricanteOCalidad) {
        toast.error(
          "No es posible asignar la misma colada a bobinas de distintos fabricantes o calidad.",
        );
        return;
      }
    }

    // Si pasa la validación o es solo 1 elemento, se abre el modal
    setOpenColadaModal(true);
  };

  // Función para procesar el guardado de la colada
  const handleConfirmarColada = async (nombreColada: string) => {
    try {
      setLoadingColada(true);

      // Aquí realizar el fetch POST/PUT hacia la API correspondiente
      /*
      await fetch(APP_ROUTES.api.tubos.asignar_colada, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, colada: nombreColada }),
      });
      */

      console.log("Asignando colada:", nombreColada, "a los IDs:", selectedIds);
      setOpenColadaModal(false);
    } catch (error) {
      console.error("Error al asignar colada:", error);
    } finally {
      setLoadingColada(false);
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
      <TopCrud
        searchTerm={searchTerm}
        handleSearchChange={(value) => {
          handleFilterChange("search", value);
        }}
        actions={
          <>
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
      <Table<BobinaCortada>
        selectable
        selectedIds={selectedIds}
        onSelectionChange={handleSelectItems}
        sortModel={sortModel}
        onSortModelChange={handleSortModel}
        page={page}
        loading={loading}
        rows={data as BobinaCortada[]}
        total={total}
        columns={columns((row) => handleEdit(``), handleDelete)}
        rowKeyExtractor={(row) => row.id}
        handlePageChange={handlePageChange}
      />

      {/* Modal para ingresar el nombre de la colada */}
      <AsignarColadaModal
        open={openColadaModal}
        onClose={() => setOpenColadaModal(false)}
        onConfirm={handleConfirmarColada}
        loading={loadingColada}
      />
    </Box>
  );
}

const columns = (
  handleEdit: (row: BobinaCortada) => void,
  handleDelete: (row: BobinaCortada) => void,
): Column<BobinaCortada>[] => [
  {
    id: "id",
    label: "ID",
    align: "left",
    width: 20,
  },
  {
    id: "bobina_concepto",
    minWidth: 200,
    label: "Bobina",
    align: "left",
    sortable: true,
  },
  {
    id: "colada",
    label: "Colada",
    align: "left",
    sortable: true,
  },
  {
    id: "turno_prefijo",
    label: "Turno",
    width: 100,
    align: "center",
  },
  {
    id: "operario",
    label: "Operario",
    align: "left",
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
        <IconButton
          size="small"
          onClick={() => handleEdit(row as unknown as BobinaCortada)}
          sx={{ color: "#64748b", "&:hover": { color: "#1e293b" } }}
        >
          <Edit2 size={16} />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => handleDelete(row as unknown as BobinaCortada)}
          sx={{ color: "#64748b", "&:hover": { color: "#ef4444" } }}
        >
          <Trash2 size={16} />
        </IconButton>
      </Box>
    ),
  },
];
