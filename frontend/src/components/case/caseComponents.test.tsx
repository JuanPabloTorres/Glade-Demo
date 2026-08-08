import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvidenceChecklist } from "./EvidenceChecklist";
import { InsightList } from "./InsightList";
import { MetricTiles } from "./MetricTiles";
import type { EvidenceRequirement } from "../../types/bankruptcy";

function requirement(key: string, satisfied: boolean): EvidenceRequirement {
  return { key, label: key.replace("evidence.", ""), satisfied };
}

describe("InsightList", () => {
  it("renders the empty message instead of an empty list", () => {
    render(<InsightList items={[]} emptyMessage="Nada pendiente" />);

    expect(screen.getByText("Nada pendiente")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders nothing at all when it is empty and has nothing to say", () => {
    // A card that renders a heading over a blank space is worse than a card
    // that renders nothing; the caller decides which by supplying a message.
    const { container } = render(<InsightList items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("says how many entries it truncated instead of silently dropping them", () => {
    render(<InsightList items={["uno", "dos", "tres", "cuatro"]} limit={2} />);

    expect(screen.getByText("uno")).toBeInTheDocument();
    expect(screen.queryByText("cuatro")).toBeNull();
    // The overview stacks several of these; a `.slice()` with no trace is how a
    // reader ends up believing they have seen the whole list.
    expect(screen.getByText("2 puntos más")).toBeInTheDocument();
  });

  it("uses the singular form for a single hidden entry", () => {
    render(<InsightList items={["uno", "dos"]} limit={1} />);

    expect(screen.getByText("1 punto más")).toBeInTheDocument();
  });
});

describe("EvidenceChecklist", () => {
  const requirements = [
    requirement("evidence.pay_stubs", true),
    requirement("evidence.government_id", false),
    requirement("evidence.bank_statements", false),
  ];

  it("ticks exactly the requirements the server marked satisfied", () => {
    // The tick is not re-derived here from the document list — that is the
    // defect this component replaced, and it disagreed with `evidence_score`.
    render(<EvidenceChecklist requirements={requirements} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Recibido");
    expect(items[1]).toHaveTextContent("Pendiente");
  });

  it("reports progress as a count and a percentage of the same list", () => {
    render(<EvidenceChecklist requirements={requirements} />);

    expect(screen.getByText("1 de 3 con respaldo")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("does not divide by zero when the case has no requirements yet", () => {
    render(<EvidenceChecklist requirements={[]} />);

    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});

describe("MetricTiles", () => {
  it("formats amounts as currency and counts as plain numbers", () => {
    render(
      <MetricTiles
        tiles={[
          { id: "cash", label: "Flujo", value: 1250 },
          { id: "cases", label: "Casos", value: 4, count: true },
        ]}
      />,
    );

    expect(screen.getByText("Flujo")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    // The exact currency string is `caseMetrics.currency`'s business; what this
    // pins is that the amount went through it and the count did not.
    expect(screen.queryByText("1250")).toBeNull();
  });
});
