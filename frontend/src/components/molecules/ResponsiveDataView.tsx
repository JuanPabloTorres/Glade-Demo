import { Card, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { ReactNode } from "react";

export interface ResponsiveDataViewColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Hide this column's label on the mobile card (e.g. a primary title already shown above it). */
  hideLabelOnCard?: boolean;
}

interface ResponsiveDataViewProps<T> {
  columns: ResponsiveDataViewColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  /** Optional actions column rendered at the end of every row/card (e.g. "Eliminar"). */
  renderActions?: (row: T) => ReactNode;
}

/**
 * Table on lg+, one Card per row on mobile/tablet — per master instruction
 * §9.5 and docs/ux/FLOWBITE-COMPONENT-STANDARDS.md. Replaces the ad hoc
 * per-table `overflow-x-auto` wrapping the audit found across the app.
 */
export function ResponsiveDataView<T>({ columns, rows, rowKey, emptyMessage, renderActions }: ResponsiveDataViewProps<T>) {
  if (!rows.length) {
    return <p className="rounded-xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-text-muted)]">{emptyMessage ?? "No hay registros todavía."}</p>;
  }

  return (
    <>
      {/* Desktop/tablet: real table, horizontal scroll only as a last resort on narrow lg screens */}
      <div className="app-table hidden overflow-x-auto rounded-xl border border-[var(--color-border)] lg:block">
        <Table hoverable>
          <TableHead>
            <TableRow>
              {columns.map((column) => <TableHeadCell key={column.key}>{column.header}</TableHeadCell>)}
              {renderActions ? <TableHeadCell><span className="sr-only">Acciones</span></TableHeadCell> : null}
            </TableRow>
          </TableHead>
          <TableBody className="divide-y divide-[var(--color-border)]">
            {rows.map((row) => (
              <TableRow key={rowKey(row)} className="bg-white">
                {columns.map((column) => <TableCell key={column.key}>{column.render(row)}</TableCell>)}
                {renderActions ? <TableCell>{renderActions(row)}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/tablet: one card per row, same data and actions */}
      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <Card key={rowKey(row)} className="border border-[var(--color-border)] bg-[var(--color-surface-muted)] shadow-none">
            <dl className="space-y-2">
              {columns.map((column) => (
                <div key={column.key} className={column.hideLabelOnCard ? "" : "flex items-baseline justify-between gap-3 text-sm"}>
                  {!column.hideLabelOnCard ? <dt className="text-[var(--color-text-muted)]">{column.header}</dt> : null}
                  <dd className={column.hideLabelOnCard ? "font-semibold text-[var(--color-text)]" : "text-right font-medium text-[var(--color-text)]"}>{column.render(row)}</dd>
                </div>
              ))}
            </dl>
            {renderActions ? <div className="mt-3">{renderActions(row)}</div> : null}
          </Card>
        ))}
      </div>
    </>
  );
}
