import Mantenimiento from "@/views/maintance/Maintance";

export default function TubosPage() {
  //   const {} = useDataTable({
  //     initFilters: [],
  //     fetchData: async (
  //       _page: number,
  //       _pageSize: number,
  //       _searchTerm: string,
  //       _filters: TableFilter[],
  //       _sortModel: unknown[],
  //     ) => {
  //       return { data: [], total: 0 };
  //     },
  //   });

  return (
    <Mantenimiento hideButton hidebar redirectUrl="/" buttonText="Inicio" />
  );
}
