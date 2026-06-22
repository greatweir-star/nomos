import React from "react";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

export type Column<T> = {
  key: string;
  header: string;
  width?: number | string;
  render: (row: T, index: number) => React.ReactNode;
};

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onReload?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

const headerCell: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontSize: "var(--font-size-xs)",
  fontWeight: 600,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  borderBottom: "1px solid var(--line)",
  whiteSpace: "nowrap",
};

const bodyCell: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: "var(--font-size-base)",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "middle",
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  onReload,
  emptyTitle = "暂无数据",
  emptyDescription,
  emptyAction,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={onRetry} onReload={onReload} />;
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ ...headerCell, width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              style={{
                cursor: onRowClick ? "pointer" : undefined,
                background: i % 2 === 0 ? "var(--paper)" : "var(--paper-soft)",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                if (onRowClick) (e.currentTarget as HTMLElement).style.background = "var(--green-soft)";
              }}
              onMouseLeave={(e) => {
                if (onRowClick) (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? "var(--paper)" : "var(--paper-soft)";
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={bodyCell}>
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
