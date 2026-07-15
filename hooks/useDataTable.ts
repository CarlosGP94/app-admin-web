import { useEffect, useState } from "react";
import { PAGE_SIZE } from "@/config/constants";
import { toast } from "react-toastify";

// ==========================================
// TIPADO ESTRICTO DE FILTROS (SIN unknown)
// ==========================================

export interface FilterOption {
  label: string;
  value: number; // Identificador numérico
}

export interface TableFilter {
  name: string;
  type: "select" | "daterange";
  value: number | null; // IDs numéricos para select
  valueStart: string | null; // ISO date string
  valueEnd: string | null; // ISO date string
  options?: FilterOption[];
}

export interface PersistedTableState {
  page: number;
  searchTerm: string;
  filters: TableFilter[] | null;
  sortModel: unknown[]; // Mantén esto según uses DataGrid (ej. GridSortModel) o puedes dejarlo como unknown[] por ahora
}

// Interfaz para el valor que recibe handleFilterChange
export interface DateRangeValue {
  start: string | null;
  end: string | null;
}

interface UseDataTableProps {
  fetchData?: (
    page: number,
    pageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: unknown[],
  ) => Promise<{ data: unknown[]; total: number } | undefined | null | void>;
  fetchFilters?: (
    filters: TableFilter[],
  ) => Promise<Record<string, (FilterOption | number | string)[]>>;
  initFilters: TableFilter[];
  externalDeps?: unknown[];
  onDeleteConfirm?: (
    id: string | number,
  ) => Promise<{ success: boolean; error?: string }>;
  onCreateConfirm?: (
    newData: unknown,
  ) => Promise<{ success: boolean; error?: string }>;
  onEditConfirm?: (
    newData: unknown,
  ) => Promise<{ success: boolean; error?: string }>;
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

interface Error {
  message?: string;
}

const useDataTable = ({
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
}: UseDataTableProps) => {
  const [reinitFilters, setReinitFilters] = useState<boolean>(false);

  const [page, setPage] = useState<number>(persistedState?.page || 1);
  const [searchTerm, setSearchTerm] = useState<string>(
    persistedState?.searchTerm || "",
  );
  const [filters, setFilteredMallas] = useState<TableFilter[]>(
    persistedState?.filters || initFilters,
  );
  const [sortModel, setSortModel] = useState<unknown[]>(
    persistedState?.sortModel || [],
  );

  const [total, setTotal] = useState<number>(0);
  const [data, setData] = useState<unknown[]>([]);
  const [initializedFilters, setInitializedFilters] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFilters, setLoadingFilters] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<unknown>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDetail, setShowDetail] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<unknown[]>([]);

  useEffect(() => {
    if (onPersistStateChange) {
      onPersistStateChange({
        page,
        searchTerm,
        filters,
        sortModel,
      });
    }
  }, [page, searchTerm, filters, sortModel, onPersistStateChange]);

  const handleSortModel = (model: unknown[]) => {
    setSortModel(model);
  };

  const handleSelectItems = (ids: unknown[], type?: "exclude" | "include") => {
    if (type === "exclude") {
      setSelectedIds(data.map((item) => item.id));
    } else {
      setSelectedIds([...ids]);
    }
  };

  const handleSelectItem = (item: unknown) => {
    if (!item) {
      setSelectedItem(null);
    } else {
      setSelectedItem(item);
    }
  };

  const setInitFilters = async () => {
    setLoadingFilters(true);
    const filtersData = await fetchFilters(filters);
    const initializedFilters = initFilters.map((filter) => {
      const rawOptions = filtersData[filter.name] || [];
      return {
        ...filter,
        options: rawOptions.map((option): FilterOption => {
          if (
            typeof option === "object" &&
            option !== null &&
            "label" in option &&
            "value" in option
          ) {
            return {
              label: option.label,
              value: Number(option.value),
            };
          }
          return {
            label: String(option),
            value: Number(option),
          };
        }),
      };
    });
    setFilteredMallas(initializedFilters);
    setLoadingFilters(false);
    setInitializedFilters(true);
  };

  const handleOtherAction = async () => {
    try {
      setActionLoading(true);
      const resp = await onOtherAction();
      if (!resp.success) throw new Error(resp.error || "Error desconocido");
      setActionLoading(false);
      if (resp.message) toast.success(resp.message);
    } catch (error: unknown) {
      setActionLoading(false);
      toast.error(
        error?.message ? error?.message : "Error al realizar la acción.",
      );
      console.error("Error:", error);
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
      setInitFilters();
    } catch (error: unknown) {
      setActionLoading(false);
      toast.error(
        error?.message ? error?.message : "Error al eliminar el elemento.",
      );
      console.error("Error deleting item:", error);
    }
  };

  const handleCreateConfirm = async (newData: unknown) => {
    try {
      setShowForm(false);
      setActionLoading(true);
      const resp = await onCreateConfirm(newData);
      if (!resp?.success) throw new Error(resp?.error || "Error desconocido");
      setActionLoading(false);
      toast.success("Elemento creado correctamente.");
      await loadData(page, searchTerm, filters);
      setInitFilters();
      await handleAfterCreate();
    } catch (error: unknown) {
      setActionLoading(false);
      toast.error(
        error?.message ? error?.message : "Error al crear el elemento.",
      );
      console.error("Error creating item:", error.message);
    }
  };

  const handleEditConfirm = async (newData: unknown) => {
    try {
      setShowForm(false);
      setActionLoading(true);
      const resp = await onEditConfirm(newData);
      if (!resp?.success) throw new Error(resp?.error || "Error desconocido");
      setActionLoading(false);
      toast.success("Elemento actualizado correctamente.");
      await loadData(page, searchTerm, filters);
      setInitFilters();
      await handleAfterUpdate();
    } catch (error: unknown) {
      setActionLoading(false);
      toast.error(
        error?.message ? error?.message : "Error al actualizar el elemento.",
      );
      console.error("Error updating item:", error);
    }
  };

  const handleCreate = (isCancel: boolean = false) => {
    setSelectedItem(null);
    setShowForm(isCancel ? false : true);
  };

  const handleEdit = (item: unknown) => {
    if (!item) {
      setShowForm(true);
      setSelectedItem(null);
      return;
    }
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleDetail = (item: unknown) => {
    if (!item) {
      setShowDetail(true);
      setSelectedItem(null);
      return;
    }
    setSelectedItem(item);
    setShowDetail(true);
  };

  const handleDelete = (item: unknown) => {
    if (!item) {
      setSelectedItem(null);
      setShowDeleteConfirm(false);
      return;
    }
    setSelectedItem(item);
    setShowDeleteConfirm(true);
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
    setData(result?.data || []);
    setTotal(result?.total || 0);
    setLoading(false);
    if (!initializedFilters) setInitFilters();
  };

  // handleFilterChange con firmas de tipo estrictas para 'select' y 'daterange'
  const handleFilterChange = async (
    filterName: string,
    value: number | DateRangeValue | string | null,
    type: "select" | "daterange" = "select",
  ) => {
    if (filterName === "search") {
      setSearchTerm(typeof value === "string" ? value : "");
      return;
    }

    let newFilters = filters.map((filter) => {
      if (filter.name === filterName) {
        if (type === "daterange") {
          const range = value as DateRangeValue;
          return {
            ...filter,
            valueStart: range?.start || null,
            valueEnd: range?.end || null,
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

    const filtersData = await fetchFilters(filters);
    newFilters = newFilters.map((filter) => {
      const rawOptions = filtersData[filter.name] || [];
      return {
        ...filter,
        options: rawOptions.map((option): FilterOption => {
          if (
            typeof option === "object" &&
            option !== null &&
            "label" in option &&
            "value" in option
          ) {
            return {
              label: option.label,
              value: Number(option.value),
            };
          }
          return {
            label: String(option),
            value: Number(option),
          };
        }),
      };
    });

    setFilteredMallas(newFilters);
    setSortModel([]);
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
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  useEffect(() => {
    loadData(page, searchTerm, filters);
  }, [page, filters, searchTerm, sortModel, ...externalDeps]);

  return {
    data,
    total,
    loading,
    page,
    handleFilterChange,
    handlePageChange,
    searchTerm,
    filters,
    loadingFilters,
    selectedIds,
    sortModel,
    handleSortModel,
    handleSelectItem,
    selectedItem,
    setSelectedItem,
    showDeleteConfirm,
    handleDelete,
    showDetail,
    handleDetail,
    showForm,
    handleEdit,
    handleCreate,
    actionLoading,
    setActionLoading,
    handleDeleteConfirm,
    handleCreateConfirm,
    handleEditConfirm,
    handleOtherAction,
    handleClearAllFilters,
    setInitFilters,
    handleSelectItems,
    handleFetchData: loadData,
  };
};

export default useDataTable;
