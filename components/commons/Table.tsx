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
import TableFooter from "@mui/material/TableFooter";
import TableSortLabel from "@mui/material/TableSortLabel";
import { Skeleton } from "@mui/material";
import { PAGE_SIZE } from "@/config/constants";

export interface Column<T> {
  id: keyof T;
  label: string;
  minWidth?: number;
  width?: number;
  align?: "right" | "left" | "center";
  sortable?: boolean;
  format?: (value: T[keyof T]) => React.ReactNode;
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

  return (
    <Paper
      variant="outlined"
      sx={{
        width: "100%",
        borderRadius: 2,
        overflow: "hidden",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f8fafc",
        height: "100%",
      }}
    >
      <TableContainer
        sx={{ flex: 1, display: "flex", flexDirection: "column" }}
      >
        <Table
          stickyHeader
          aria-label="sticky table"
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <TableHead sx={{ display: "grid" }}>
            <TableRow sx={{ display: "flex", width: "100%" }}>
              {columns.map((column) => {
                const columnIdStr = String(column.id);
                const { active, direction } = getColumnSortState(columnIdStr);

                return (
                  <TableCell
                    key={columnIdStr}
                    align={column.align}
                    style={{ width: column.width, minWidth: column.minWidth }}
                    sx={{
                      ...stylesHeaderCell,
                      flex: column.width ? `0 0 ${column.width}px` : 1,
                    }}
                  >
                    {column.sortable ? (
                      <TableSortLabel
                        active={active}
                        direction={direction === "asc" ? "desc" : "asc"}
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

          <TableBody
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
            }}
          >
            {loading ? (
              Array.from(new Array(PAGE_SIZE)).map((_, rowIndex) => (
                <TableRow
                  key={`skeleton-row-${rowIndex}`}
                  sx={{ display: "flex", width: "100%" }}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={`skeleton-cell-${rowIndex}-${column.id as string}`}
                      align={column.align}
                      sx={{ flex: column.width ? `0 0 ${column.width}px` : 1 }}
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
              <TableRow
                sx={{
                  display: "flex",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ borderBottom: "none" }}
                >
                  No hay elementos para mostrar
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow
                  hover
                  role="checkbox"
                  tabIndex={-1}
                  key={rowKeyExtractor(row) || rowIndex}
                  sx={{
                    display: "flex",
                    width: "100%",
                    position: "relative",
                    "&:hover .MuiTableCell-root:first-of-type": {
                      borderLeftColor: "primary.main",
                    },
                  }}
                >
                  {columns.map((column, colIndex) => {
                    const value = row[column.id];
                    return (
                      <TableCell
                        key={String(column.id)}
                        align={column.align}
                        sx={{
                          flex: column.width ? `0 0 ${column.width}px` : 1,
                          ...(colIndex === 0 && {
                            borderLeft: "6px solid transparent",
                            transition: "border-color 0.15s ease-in-out",
                          }),
                        }}
                      >
                        {column.format
                          ? column.format(value)
                          : String(value ?? "")}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>

          <TableFooter sx={{ display: "grid" }}>
            <TableRow sx={{ display: "flex", width: "100%" }}>
              <TablePagination
                sx={{
                  backgroundColor: "#ECEEF0",
                  borderTop: "1px solid #c5c5d2",
                  width: "100%",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
                rowsPerPage={PAGE_SIZE}
                rowsPerPageOptions={[PAGE_SIZE]}
                count={total}
                page={page - 1}
                onPageChange={(_, value) => handlePageChange(value + 1)}
                colSpan={columns.length}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) =>
                  `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
                }
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
}
