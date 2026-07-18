"use client";
import { useEffect, useState } from "react";
import { PAGE_SIZE } from "@/config/constants";
import { toast } from "react-toastify";

// ==========================================
// TIPADO ESTRICTO DE FILTROS
// ==========================================
export interface FilterOption {
  label: string;
  value: number | string | Date;
}

export interface CurrentFilter {
  name: string;
  value: string | number | null;
  valueStart?: string | null;
  valueEnd?: string | null;
  type: "select" | "daterangeStart" | "daterangeEnd" | "autocomplete";
}

export interface TableFilter {
  name: string;
  label: string;
  type: "select" | "daterangeStart" | "daterangeEnd" | "autocomplete";
  value?: string | number | null;
  limitStart?: number;
  limitEnd?: number;
  valueStart?: string | null;
  valueEnd?: string | null;
  defaultLabel?: string;
  options?: FilterOption[];
}

export interface PersistedTableState {
  page: number;
  searchTerm: string;
  filters: TableFilter[] | null;
  sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[];
}

export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

interface UseDataTableProps<T extends { id: string | number }> {
  fetchData?: (
    page: number,
    pageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ) => Promise<{ data: T[]; total: number } | undefined | null | void>;
  fetchFilters?: (
    filters: CurrentFilter[],
  ) => Promise<Record<string, (FilterOption | number | string)[]>>;
  initFilters: TableFilter[];
  externalDeps?: unknown[];
  onDeleteConfirm?: (
    id: string | number,
  ) => Promise<{ success: boolean; error?: string }>;
  onCreateConfirm?: (
    newData: Partial<T>,
  ) => Promise<{ success: boolean; error?: string }>;
  onEditConfirm?: (newData: T) => Promise<{ success: boolean; error?: string }>;
  onOtherAction?: () => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  handleAfterUpdate?: () => Promise<void> | void;
  handleAfterCreate?: () => Promise<void> | void;
  successActionMessage?: string;
  persistedState?: PersistedTableState;
  onPersistStateChange?: (state: PersistedTableState) => void;
}

const useDataTable = <T extends { id: string | number }>({
  fetchData = async () => ({ data: [], total: 0 }),
  fetchFilters = async () => ({}),
  initFilters,
  externalDeps = [],
  onDeleteConfirm = async () => ({ success: true }),
  onCreateConfirm = async () => ({ success: true }),
  onEditConfirm = async () => ({ success: true }),
  onOtherAction = async () => ({ success: true }),
  handleAfterUpdate = async () => {},
  handleAfterCreate = async () => {},
  successActionMessage = "Acción realizada correctamente",
  persistedState,
  onPersistStateChange,
}: UseDataTableProps<T>) => {
  const [page, setPage] = useState<number>(persistedState?.page || 1);
  const [searchTerm, setSearchTerm] = useState<string>(
    persistedState?.searchTerm || "",
  );
  const [filters, setFilteredMallas] = useState<TableFilter[]>(
    persistedState?.filters || initFilters,
  );
  const [sortModel, setSortModel] = useState<
    { orderBy: string; orderDir: "ASC" | "DESC" }[]
  >(persistedState?.sortModel || []);
  const [total, setTotal] = useState<number>(0);

  const [data, setData] = useState<T[]>([]);
  const [initializedFilters, setInitializedFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Mutación limpia de mapeo de opciones devueltas de base de datos
  const mapRawOptions = (
    type: "select" | "daterangeStart" | "daterangeEnd" | "autocomplete",
    rawOptions: (FilterOption | number | string)[],
  ): FilterOption[] => {
    return rawOptions.map((option) => {
      if (
        typeof option === "object" &&
        option !== null &&
        "label" in option &&
        "value" in option
      ) {
        return {
          label: option.label,
          value:
            type === "daterangeStart" || type === "daterangeEnd"
              ? new Date(option.value).toISOString().split("T")[0] // Convierte a "YYYY-MM-DD"
              : Number(option.value),
        };
      }
      return { label: String(option), value: Number(option) };
    });
  };

  useEffect(() => {
    if (onPersistStateChange) {
      onPersistStateChange({ page, searchTerm, filters, sortModel });
    }
  }, [page, searchTerm, filters, sortModel, onPersistStateChange]);

  const handleSortModel = (
    model: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ) => {
    setSortModel(model);
  };

  const handleSelectItems = (
    ids: (string | number)[],
    type?: "exclude" | "include",
  ) => {
    if (type === "exclude") {
      setSelectedIds(data.map((item) => item.id));
    } else {
      setSelectedIds([...ids]);
    }
  };

  const handleSelectItem = (item: T | null) => {
    setSelectedItem(item);
  };

  // Inicializa los filtros usando el estado base actual
  const setInitFilters = async (currentFilters: TableFilter[] = filters) => {
    setLoadingFilters(true);
    try {
      const filtersData = await fetchFilters(
        currentFilters.map((filter) => ({
          name: filter.name,
          value: filter.value || null,
          valueStart: filter.valueStart || null,
          valueEnd: filter.valueEnd || null,
          type: filter.type,
        })),
      );
      const updated = currentFilters.map((filter) => ({
        ...filter,
        options: mapRawOptions(filter.type, filtersData[filter.name] || []),
      }));
      setFilteredMallas(updated);
      setInitializedFilters(true);
    } catch (err) {
      console.error("Error inicializando filtros:", err);
    } finally {
      setLoadingFilters(false);
    }
  };

  const handleOtherAction = async () => {
    try {
      setActionLoading(true);
      const resp = await onOtherAction();
      if (!resp.success) throw new Error(resp.error || "Error desconocido");
      setActionLoading(false);
      if (resp.message) toast.success(resp.message);
    } catch (error) {
      setActionLoading(false);
      toast.error("Error al realizar la acción.");
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setShowDeleteConfirm(false);
      setActionLoading(true);
      const resp = await onDeleteConfirm(selectedItem?.id || "");
      if (!resp.success) throw new Error(resp.error || "Error desconocido");
      setActionLoading(false);
      toast.success("Elemento eliminado correctamente.");
      await loadData(page, searchTerm, filters);
      await setInitFilters();
    } catch (error) {
      setActionLoading(false);
      toast.error("Error al eliminar el elemento.");
    }
  };

  const handleCreateConfirm = async (newData: Partial<T>) => {
    try {
      setShowForm(false);
      setActionLoading(true);
      const resp = await onCreateConfirm(newData);
      if (!resp?.success) throw new Error(resp?.error || "Error desconocido");
      setActionLoading(false);
      toast.success("Elemento creado correctamente.");
      await loadData(page, searchTerm, filters);
      await setInitFilters();
      await handleAfterCreate();
    } catch (error) {
      setActionLoading(false);
      toast.error("Error al crear el elemento.");
    }
  };

  const handleEditConfirm = async (newData: T) => {
    try {
      setShowForm(false);
      setActionLoading(true);
      const resp = await onEditConfirm(newData);
      if (!resp?.success) throw new Error(resp?.error || "Error desconocido");
      setActionLoading(false);
      toast.success(successActionMessage);
      await loadData(page, searchTerm, filters);
      await setInitFilters();
      await handleAfterUpdate();
    } catch (error) {
      setActionLoading(false);
      toast.error("Error al actualizar el elemento.");
    }
  };

  const handleCreate = (isCancel: boolean = false) => {
    setSelectedItem(null);
    setShowForm(!isCancel);
  };

  const handleEdit = (item: T | null) => {
    setSelectedItem(item);
    setShowForm(!!item);
  };

  const handleDetail = (item: T | null) => {
    setSelectedItem(item);
    setShowDetail(!!item);
  };

  const handleDelete = (item: T | null) => {
    setSelectedItem(item);
    setShowDeleteConfirm(!!item);
  };

  const loadData = async (
    currentPage: number,
    currentSearch: string,
    currentFilters: TableFilter[],
  ) => {
    setLoading(true);
    const result = await fetchData(
      currentPage,
      PAGE_SIZE,
      currentSearch,
      currentFilters,
      sortModel,
    );
    setData((result?.data as T[]) || []);
    setTotal(result?.total || 0);
    setLoading(false);
    if (!initializedFilters) setInitFilters(currentFilters);
  };

  const handleFilterChange = async (
    filterName: string,
    value: number | DateRangeValue | string | null,
    type:
      | "select"
      | "daterangeStart"
      | "daterangeEnd"
      | "autocomplete" = "select",
  ) => {
    if (filterName === "search") {
      setSearchTerm(typeof value === "string" ? value : "");
    }

    // 1. Crear el nuevo array de filtros con los datos actuales frescos
    const targetFilters: TableFilter[] = filters.map((filter) => {
      if (filter.name === filterName) {
        if (type === "daterangeStart") {
          return {
            ...filter,
            value: value ? String(value) : null,
            valueStart: value ? String(value) : null,
            type,
          };
        } else if (type === "daterangeEnd") {
          return {
            ...filter,
            value: value ? String(value) : null,
            valueEnd: value ? String(value) : null,
          };
        } else {
          return {
            ...filter,
            value: typeof value === "number" ? value : null,
          };
        }
      }
      return filter;
    });

    setLoadingFilters(true);
    try {
      // 2. Traer del backend las opciones calculadas basados en los filtros combinados actualizados
      const filtersData = await fetchFilters(
        targetFilters.map((filter) => ({
          name: filter.name,
          value: filter.value || null,
          valueStart: filter.valueStart || null,
          valueEnd: filter.valueEnd || null,
          type: filter.type,
        })),
      );

      const updatedFiltersWithNewOptions = targetFilters.map((filter) => ({
        ...filter,
        options: mapRawOptions(filter.type, filtersData[filter.name] || []),
      }));

      setFilteredMallas(updatedFiltersWithNewOptions);
    } catch (err) {
      console.error("Error refrescando opciones cruzadas de filtros:", err);
    } finally {
      setLoadingFilters(false);
    }
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    const resetFilters = filters.map((filter) => ({
      ...filter,
      value: null,
      valueStart: null,
      valueEnd: null,
    }));
    setFilteredMallas(resetFilters);
    setPage(1);
    setSortModel([]);
    setInitFilters(resetFilters);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFilter = async () => {
    setPage(1);
    setSortModel([]);
  };

  useEffect(() => {
    loadData(page, searchTerm, filters);
  }, [page, sortModel, ...externalDeps]);

  return {
    data,
    total,
    loading,
    page,
    searchTerm,
    filters,
    loadingFilters,
    selectedIds,
    sortModel,
    selectedItem,
    showDeleteConfirm,
    showDetail,
    showForm,
    actionLoading,
    handleFilterChange,
    handlePageChange,
    handleSortModel,
    handleSelectItem,
    setSelectedItem,
    handleDelete,
    handleDetail,
    handleEdit,
    handleCreate,
    setActionLoading,
    handleDeleteConfirm,
    handleCreateConfirm,
    handleEditConfirm,
    handleOtherAction,
    handleClearAllFilters,
    setInitFilters,
    handleSelectItems,
    handleFetchData: loadData,
    handleFilter,
  };
};

export default useDataTable;
