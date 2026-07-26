"use client";
import * as React from "react";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Checkbox from "@mui/material/Checkbox";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Skeleton } from "@mui/material";
import InboxIcon from "@mui/icons-material/Inbox"; // Opcional: icono representativo
import { PAGE_SIZE } from "@/config/constants";

export interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  fontWeight?: "normal" | "bold" | number;
  width?: number;
  align?: "right" | "left" | "center";
  sortable?: boolean;
  format?: (row: T) => React.ReactNode;
}

interface GenericTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  total?: number;
  rowKeyExtractor: (row: T) => string | number;
  loading?: boolean;
  page?: number;
  handlePageChange?: (newPage: number) => void;
  sortModel: { orderBy: string; orderDir: "ASC" | "DESC" }[];
  onSortModelChange: (
    model: { orderBy: string; orderDir: "ASC" | "DESC" }[],
  ) => void;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (selectedIds: (string | number)[]) => void;
  emptyMessage?: string; // Prop opcional para personalizar el mensaje
}

const stylesHeaderCell = {
  backgroundColor: "#ECEEF0",
  color: "#454650",
  fontWeight: "bold",
  textTransform: "uppercase" as const,
  borderBottom: "1px solid #c5c5d2",
};

export default function ColumnGroupingTable<T>({
  rows,
  columns,
  total = rows.length,
  loading = false,
  page = 1,
  handlePageChange = () => {},
  rowKeyExtractor,
  sortModel,
  onSortModelChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  emptyMessage = "No se encontraron elementos",
}: GenericTableProps<T>) {
  const getColumnSortState = (columnId: string) => {
    const activeSort = sortModel.find((item) => item.orderBy === columnId);
    if (!activeSort) return { active: false, direction: "asc" as const };
    return {
      active: true,
      direction: activeSort.orderDir.toLowerCase() as "asc" | "desc",
    };
  };

  const handleSortRequest = (columnId: string) => {
    const activeSort = sortModel.find((item) => item.orderBy === columnId);

    if (!activeSort) {
      onSortModelChange([{ orderBy: columnId, orderDir: "ASC" }]);
    } else if (activeSort.orderDir === "ASC") {
      onSortModelChange([{ orderBy: columnId, orderDir: "DESC" }]);
    } else {
      onSortModelChange([]);
    }
  };

  const pageRowKeys = React.useMemo(
    () => rows.map(rowKeyExtractor),
    [rows, rowKeyExtractor],
  );

  const isAllSelected = React.useMemo(() => {
    if (pageRowKeys.length === 0) return false;
    return pageRowKeys.every((key) => selectedIds.includes(key));
  }, [pageRowKeys, selectedIds]);

  const isSomeSelected = React.useMemo(() => {
    return (
      pageRowKeys.some((key) => selectedIds.includes(key)) && !isAllSelected
    );
  }, [pageRowKeys, selectedIds, isAllSelected]);

  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (event.target.checked) {
      const newSelections = [...selectedIds];
      pageRowKeys.forEach((key) => {
        if (!newSelections.includes(key)) newSelections.push(key);
      });
      onSelectionChange(newSelections);
    } else {
      const newSelections = selectedIds.filter(
        (id) => !pageRowKeys.includes(id),
      );
      onSelectionChange(newSelections);
    }
  };

  const handleRowSelectClick = (id: string | number) => {
    if (!onSelectionChange) return;
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected: (string | number)[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedIds, id];
    } else {
      newSelected = selectedIds.filter((item) => item !== id);
    }
    onSelectionChange(newSelected);
  };

  // Cálculo de columnas totales para abarcar el ancho completo en el estado sin datos
  const totalColumns = columns.length + (selectable ? 1 : 0);

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f8fafc",
        height: "100%",
        flex: 1,
      }}
    >
      <TableContainer
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "auto",
          "&::-webkit-scrollbar": {
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "#f1f1f1",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#c5c5d2",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "#a8a8b8",
            },
          },
          scrollbarWidth: "thin",
          scrollbarColor: "#c5c5d2 #f1f1f1",
        }}
      >
        <Table
          stickyHeader
          aria-label="sticky table"
          sx={{
            minWidth: "max-content",
            tableLayout: "fixed",
            width: "100%",
          }}
        >
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell
                  padding="checkbox"
                  sx={{
                    ...stylesHeaderCell,
                    width: 50,
                    boxShadow: "inset 6px 0px 0px 0px transparent",
                  }}
                >
                  <Checkbox
                    color="primary"
                    indeterminate={isSomeSelected}
                    checked={isAllSelected}
                    onChange={handleSelectAllClick}
                    disabled={loading || rows.length === 0}
                    size="small"
                  />
                </TableCell>
              )}

              {columns.map((column, colIndex) => {
                const columnIdStr = String(column.id);
                const { active, direction } = getColumnSortState(columnIdStr);

                return (
                  <TableCell
                    key={columnIdStr}
                    align={column.align}
                    style={{
                      width: column.width || "auto",
                      minWidth: column.minWidth,
                    }}
                    sx={{
                      ...stylesHeaderCell,
                      ...(!selectable &&
                        colIndex === 0 && {
                          boxShadow: "inset 6px 0px 0px 0px transparent",
                        }),
                    }}
                  >
                    {column.sortable ? (
                      <TableSortLabel
                        active={active}
                        direction={direction}
                        onClick={() => handleSortRequest(columnIdStr)}
                        sx={{
                          "&.MuiTableSortLabel-active": { color: "#454650" },
                          "& .MuiTableSortLabel-icon": {
                            color: "#454650 !important",
                          },
                        }}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>

          <TableBody sx={{ backgroundColor: "#ffffff" }}>
            {loading ? (
              Array.from(new Array(PAGE_SIZE)).map((_, rowIndex) => (
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {selectable && (
                    <TableCell
                      padding="checkbox"
                      sx={{ boxShadow: "inset 6px 0px 0px 0px transparent" }}
                    >
                      <Skeleton
                        variant="rectangular"
                        width={20}
                        height={20}
                        animation="wave"
                      />
                    </TableCell>
                  )}
                  {columns.map((column, colIndex) => (
                    <TableCell
                      key={`skeleton-cell-${rowIndex}-${column.id as string}`}
                      align={column.align}
                      style={{
                        width: column.width || "auto",
                        minWidth: column.minWidth,
                      }}
                      sx={{
                        ...(!selectable &&
                          colIndex === 0 && {
                            boxShadow: "inset 6px 0px 0px 0px transparent",
                          }),
                      }}
                    >
                      <Skeleton
                        animation="wave"
                        variant="text"
                        width={column.align === "right" ? "60%" : "85%"}
                        height={20}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              /* ESTADO VACÍO (SIN ELEMENTOS) */
              <TableRow sx={{ height: "100%" }}>
                <TableCell
                  colSpan={totalColumns}
                  align="center"
                  sx={{
                    py: 8,
                    borderBottom: "none",
                    height: "100%",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: 1.5,
                      color: "#8a8c9e",
                    }}
                  >
                    <InboxIcon sx={{ fontSize: 48, color: "#c5c5d2" }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {emptyMessage}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => {
                const rowKey = rowKeyExtractor(row) || rowIndex;
                const isItemSelected = selectedIds.includes(rowKey);

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={rowKey}
                    selected={selectable && isItemSelected}
                    sx={{
                      "&:hover .MuiTableCell-root:first-of-type": {
                        boxShadow: "inset 6px 0px 0px 0px #001040",
                      },
                    }}
                  >
                    {selectable && (
                      <TableCell
                        padding="checkbox"
                        onClick={() => handleRowSelectClick(rowKey)}
                        sx={{
                          transition: "box-shadow 0.15s ease-in-out",
                          boxShadow: "inset 6px 0px 0px 0px transparent",
                          cursor: "pointer",
                        }}
                      >
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          size="small"
                        />
                      </TableCell>
                    )}

                    {columns.map((column, colIndex) => {
                      const value = row[column.id];
                      return (
                        <TableCell
                          key={String(column.id)}
                          align={column.align}
                          style={{
                            width: column.width || "auto",
                            minWidth: column.minWidth,
                          }}
                          sx={{
                            ...(!selectable &&
                              colIndex === 0 && {
                                boxShadow: "inset 6px 0px 0px 0px transparent",
                                transition: "box-shadow 0.15s ease-in-out",
                              }),
                            ...(column.fontWeight && {
                              fontWeight: column.fontWeight,
                            }),
                          }}
                        >
                          {column.format
                            ? column.format(row)
                            : String(value ?? "-")}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid #c5c5d2",
          backgroundColor: "#ECEEF0",
          px: 3,
        }}
      >
        <Box sx={{ minWidth: "150px" }}>
          {selectable && selectedIds.length > 0 && (
            <Typography
              variant="body2"
              sx={{
                color: "#001040",
                fontWeight: "bold",
                backgroundColor: "#e0e4e8",
                px: 1.5,
                py: 0.5,
                borderRadius: "12px",
                display: "inline-block",
                fontSize: "0.75rem",
              }}
            >
              {selectedIds.length}{" "}
              {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
            </Typography>
          )}
        </Box>

        <TablePagination
          component="div"
          sx={{
            borderTop: "none",
            "& .MuiTablePagination-toolbar": {
              paddingLeft: 0,
            },
          }}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
          count={total}
          page={Math.max(0, page - 1)}
          onPageChange={(_, value) => handlePageChange(value + 1)}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from} - ${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Box>
    </Paper>
  );
}
