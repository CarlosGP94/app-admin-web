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
  label: string;
  type: "select" | "daterangeStart" | "daterangeEnd" | "autocomplete";
  value?: number | null; // IDs numéricos para select
  valueStart?: string | null; // ISO date string
  valueEnd?: string | null; // ISO date string
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

// 1. Añadimos el genérico <T> extendiendo un objeto con la propiedad mínima 'id'
interface UseDataTableProps<T extends { id: string | number }> {
  fetchData?: (
    page: number,
    pageSize: number,
    searchTerm: string,
    filters: TableFilter[],
    sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ) => Promise<{ data: T[]; total: number } | undefined | null | void>; // Retorna T[]
  fetchFilters?: (
    filters: TableFilter[],
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

// 2. Declaramos la función usando el genérico <T>
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

  // 3. Tipamos los estados dinámicos usando 'T'
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
    } catch (error) {
      setActionLoading(false);
      console.error("Error do action:", error);
      toast.error("Error al realizar la acción.");
      console.error("Error:", error);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      setShowDeleteConfirm(false);
      setActionLoading(true);
      // Ahora TS sabe que selectedItem tiene la propiedad id de forma segura
      const resp = await onDeleteConfirm(selectedItem?.id || "");
      if (!resp.success) throw new Error(resp.error || "Error desconocido");
      setActionLoading(false);
      toast.success("Elemento eliminado correctamente.");
      await loadData(page, searchTerm, filters);
      setInitFilters();
    } catch (error) {
      setActionLoading(false);
      console.error("Error deleting item:", error);
      toast.error("Error al eliminar el elemento.");
      console.error("Error deleting item:", error);
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
      setInitFilters();
      await handleAfterCreate();
    } catch (error) {
      setActionLoading(false);
      console.error("Error creating item:", error);
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
      setInitFilters();
      await handleAfterUpdate();
    } catch (error) {
      setActionLoading(false);
      console.error("Error updating item:", error);
      toast.error("Error al actualizar el elemento.");
    }
  };

  const handleCreate = (isCancel: boolean = false) => {
    setSelectedItem(null);
    setShowForm(isCancel ? false : true);
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
    if (!initializedFilters) setInitFilters();
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
      return;
    }

    let newFilters = filters.map((filter) => {
      if (filter.name === filterName) {
        if (type === "daterangeStart") {
          return {
            ...filter,
            valueStart: value ? String(value) : null,
          };
        } else if (type === "daterangeEnd") {
          return {
            ...filter,
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
