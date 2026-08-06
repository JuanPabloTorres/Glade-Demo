import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResponsiveDataView } from "./ResponsiveDataView";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: "r1", name: "Caribe Services", amount: 2600 },
  { id: "r2", name: "Freelance", amount: 900 },
];

const columns = [
  { key: "name", header: "Fuente", hideLabelOnCard: true, render: (row: Row) => row.name },
  { key: "amount", header: "Monto", render: (row: Row) => `$${row.amount}` },
];

describe("ResponsiveDataView", () => {
  it("shows the empty-state message when there are no rows", () => {
    render(<ResponsiveDataView columns={columns} rows={[]} rowKey={(r) => r.id} emptyMessage="Aún no has agregado ingresos." />);
    expect(screen.getByText("Aún no has agregado ingresos.")).toBeInTheDocument();
  });

  it("renders both the desktop table and the mobile card markup for every row (CSS switches which is visible)", () => {
    const { container } = render(<ResponsiveDataView columns={columns} rows={rows} rowKey={(r) => r.id} />);
    // Desktop table: one row per data row.
    const tableRows = container.querySelectorAll("table tbody tr");
    expect(tableRows).toHaveLength(rows.length);
    // Both rows' data appear at least twice each — once in the table, once in the mobile card list.
    expect(screen.getAllByText("Caribe Services")).toHaveLength(2);
    expect(screen.getAllByText("$2600")).toHaveLength(2);
  });

  it("renders the actions slot for every row when provided", () => {
    const renderActions = vi.fn((row: Row) => <button>Eliminar {row.name}</button>);
    render(<ResponsiveDataView columns={columns} rows={rows} rowKey={(r) => r.id} renderActions={renderActions} />);
    expect(renderActions).toHaveBeenCalledTimes(rows.length * 2); // once per row per layout (table + cards)
    expect(screen.getAllByRole("button", { name: /Eliminar Caribe Services/ })).toHaveLength(2);
  });
});
