import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { BottomNavigation } from "./BottomNavigation";
import { Sidebar } from "./Sidebar";
import type { BankruptcyCase } from "../../../types/bankruptcy";

const mockUseAuth = vi.fn();
const mockUseBankruptcyWorkspace = vi.fn();

vi.mock("../../../auth/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../../../workspace/BankruptcyWorkspaceContext", () => ({
  useBankruptcyWorkspace: () => mockUseBankruptcyWorkspace(),
}));

function makeCase(overrides: Partial<BankruptcyCase> = {}): BankruptcyCase {
  return {
    id: "case-1",
    ownerUserId: "client-1",
    clientName: "Elena Rivera",
    clientEmail: "client@freshstart.demo",
    preferredLanguage: "es",
    status: "draft",
    household: {
      householdSize: 1,
      dependents: 0,
      filingJointly: false,
      urgentCollectionAction: false,
      recentPropertyTransfer: false,
    },
    incomes: [],
    expenses: [],
    debts: [],
    assets: [],
    evidence: [],
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    messages: [],
    timeline: [],
    ...overrides,
  };
}

const CLIENT = { id: "client-1", name: "Elena Rivera", email: "client@freshstart.demo", role: "client" };
const ATTORNEY = { id: "attorney-1", name: "Casey Attorney", email: "attorney@freshstart.demo", role: "attorney" };

function renderAt(ui: React.ReactElement, initialPath = "/") {
  return render(<MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>);
}

function asClient(cases: BankruptcyCase[] = []) {
  mockUseAuth.mockReturnValue({ user: CLIENT });
  mockUseBankruptcyWorkspace.mockReturnValue({ cases });
}

describe("Sidebar", () => {
  it("renders the full client nav and marks 'Inicio' active on the home route", () => {
    asClient();

    renderAt(<Sidebar />, "/");

    ["Inicio", "Mi caso", "Documentos", "Tareas", "Actividad", "Asistente", "Ayuda"].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole("link", { name: /Inicio/ })[0]).toHaveAttribute("aria-current", "page");
  });

  it("shows the product name, so the sidebar carries the branding at tablet and desktop widths", () => {
    asClient();

    renderAt(<Sidebar />, "/");

    expect(screen.getAllByText("Fresh Start").length).toBeGreaterThan(0);
  });

  it("disables case-scoped client nav items when the client has no active case yet", () => {
    asClient();

    renderAt(<Sidebar />, "/");

    expect(screen.getAllByRole("button", { name: /Mi caso/ })[0]).toBeDisabled();
  });

  it("points case-scoped entries at section paths once the client has a case, so each one can hold its own active state", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    renderAt(<Sidebar />, "/");

    expect(screen.getAllByRole("link", { name: /Mi caso/ })[0]).toHaveAttribute("href", "/case/case-1/overview");
    expect(screen.getAllByRole("link", { name: /Documentos/ })[0]).toHaveAttribute("href", "/case/case-1/documents");
    expect(screen.getAllByRole("link", { name: /Tareas/ })[0]).toHaveAttribute("href", "/case/case-1/tasks");
    expect(screen.getAllByRole("link", { name: /Actividad/ })[0]).toHaveAttribute("href", "/case/case-1/activity");
  });

  it("marks only the open section active — not 'Mi caso', whose path is a prefix of every section", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    renderAt(<Sidebar />, "/case/case-1/documents");

    expect(screen.getAllByRole("link", { name: /Documentos/ })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: /Mi caso/ })[0]).not.toHaveAttribute("aria-current");
  });

  it("renders the attorney nav (not the client nav) for an attorney user", () => {
    mockUseAuth.mockReturnValue({ user: ATTORNEY });
    mockUseBankruptcyWorkspace.mockReturnValue({ cases: [] });

    renderAt(<Sidebar />, "/");

    ["Bandeja de casos", "Urgentes", "Documentos solicitados"].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText("Mi caso")).toBeNull();
  });
});

describe("BottomNavigation", () => {
  it("renders exactly five slots — the cap that keeps a 320px viewport tappable", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    renderAt(<BottomNavigation />, "/");

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("puts the assistant in the centre slot, whatever order the configuration lists it in", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    renderAt(<BottomNavigation />, "/");

    const labels = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(labels[2]).toBe("Asistente");
  });

  it("reaches the same destinations as the sidebar, because both read one configuration", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    const bottom = renderAt(<BottomNavigation />, "/");
    const bottomHrefs = Object.fromEntries(
      Array.from(bottom.container.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("href")]),
    );
    bottom.unmount();

    const side = renderAt(<Sidebar />, "/");
    const sideHrefs = Object.fromEntries(
      Array.from(side.container.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("href")]),
    );

    for (const [label, href] of Object.entries(bottomHrefs)) {
      if (label && label in sideHrefs) expect(sideHrefs[label]).toBe(href);
    }
    expect(bottomHrefs["Documentos"]).toBe("/case/case-1/documents");
  });

  it("marks the open section with aria-current so the bar shows where the user is", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    renderAt(<BottomNavigation />, "/case/case-1/tasks");

    expect(screen.getByRole("link", { name: /Tareas/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Inicio/ })).not.toHaveAttribute("aria-current");
  });

  it("keeps unavailable destinations visible but inert instead of changing shape as data arrives", () => {
    asClient();

    renderAt(<BottomNavigation />, "/");

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByRole("link", { name: /Documentos/ })).toBeNull();
    expect(screen.getByText("Documentos").closest("[aria-disabled]")).not.toBeNull();
  });

  it("is labelled as a navigation landmark and hidden from 768px up, where the sidebar takes over", () => {
    asClient([makeCase({ ownerUserId: "client-1" })]);

    renderAt(<BottomNavigation />, "/");

    const nav = screen.getByRole("navigation", { name: "Navegación principal" });
    expect(nav.className).toContain("md:hidden");
    // Without this the bar sits under the home indicator on a notched phone.
    expect(nav.className).toContain("env(safe-area-inset-bottom)");
  });
});
