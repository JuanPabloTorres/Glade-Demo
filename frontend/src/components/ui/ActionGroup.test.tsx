import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ActionGroup, type ActionItem } from "./ActionGroup";

function renderGroup(props: Parameters<typeof ActionGroup>[0]) {
  return render(
    <MemoryRouter>
      <ActionGroup {...props} />
    </MemoryRouter>,
  );
}

const openMenu = () => {
  if (!screen.queryByRole("menu")) fireEvent.click(screen.getByRole("button", { name: /Más acciones/ }));
  return screen.getByRole("menu");
};

const noop = () => {};

describe("ActionGroup", () => {
  it("renders the primary action inline and keeps the rest behind one menu trigger", () => {
    renderGroup({
      primary: { id: "view", label: "Ver", onClick: noop },
      actions: [
        { id: "edit", label: "Editar", onClick: noop },
        { id: "archive", label: "Archivar", onClick: noop },
      ],
    });

    expect(screen.getByRole("button", { name: "Ver" })).toBeInTheDocument();
    // The secondary actions must not be sitting in the row as extra buttons —
    // that is the visual-noise pattern this component exists to remove.
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();

    const menu = openMenu();
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(2);
  });

  it("marks the trigger as a menu button and reflects open state for assistive tech", () => {
    renderGroup({ primary: { id: "view", label: "Ver", onClick: noop }, actions: [{ id: "edit", label: "Editar", onClick: noop }] });

    const trigger = screen.getByRole("button", { name: /Más acciones/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("opens on ArrowDown and moves focus between items with the arrow keys", () => {
    renderGroup({
      primary: { id: "view", label: "Ver", onClick: noop },
      actions: [
        { id: "edit", label: "Editar", onClick: noop },
        { id: "archive", label: "Archivar", onClick: noop },
      ],
    });

    const trigger = screen.getByRole("button", { name: /Más acciones/ });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const items = within(screen.getByRole("menu")).getAllByRole("menuitem");
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0]!, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();

    // Wraps rather than dead-ending at the last item.
    fireEvent.keyDown(items[1]!, { key: "ArrowDown" });
    expect(items[0]).toHaveFocus();

    fireEvent.keyDown(items[0]!, { key: "End" });
    expect(items[1]).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderGroup({ primary: { id: "view", label: "Ver", onClick: noop }, actions: [{ id: "edit", label: "Editar", onClick: noop }] });

    const trigger = screen.getByRole("button", { name: /Más acciones/ });
    openMenu();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("does not run a destructive action until it is confirmed", async () => {
    const onClick = vi.fn();
    renderGroup({
      primary: { id: "view", label: "Ver", onClick: noop },
      actions: [
        {
          id: "delete",
          label: "Eliminar",
          destructive: true,
          confirm: { title: "¿Eliminar el caso?", message: "Esta acción no se puede deshacer." },
          onClick,
        },
      ],
    });

    fireEvent.click(within(openMenu()).getByRole("menuitem", { name: "Eliminar" }));

    // The click alone must not have executed anything.
    expect(onClick).not.toHaveBeenCalled();
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("¿Eliminar el caso?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /Confirmar/ }));
    await waitFor(() => expect(onClick).toHaveBeenCalledOnce());
  });

  it("removes actions the caller says the user may not perform", () => {
    renderGroup({
      primary: { id: "view", label: "Ver", onClick: noop },
      actions: [
        { id: "edit", label: "Editar", onClick: noop },
        { id: "delete", label: "Eliminar", allowed: false, onClick: noop },
        { id: "archive", label: "Archivar", hidden: true, onClick: noop },
      ],
    });

    const items = within(openMenu()).getAllByRole("menuitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("Editar");
  });

  it("renders navigation actions as real links, so they keep browser affordances", () => {
    renderGroup({
      primary: { id: "open", label: "Abrir", href: "/case/abc" },
      actions: [{ id: "activity", label: "Actividad", href: "/case/abc/activity" }],
    });

    expect(screen.getByRole("link", { name: "Abrir" })).toHaveAttribute("href", "/case/abc");
    expect(within(openMenu()).getByRole("menuitem", { name: "Actividad" })).toHaveAttribute("href", "/case/abc/activity");
  });

  it("blocks re-entry while an async action is still running", async () => {
    let release!: () => void;
    const onClick = vi.fn(() => new Promise<void>((resolve) => {
      release = resolve;
    }));

    renderGroup({
      primary: { id: "view", label: "Ver", onClick: noop },
      actions: [{ id: "sync", label: "Sincronizar", onClick } as ActionItem],
    });

    const item = within(openMenu()).getByRole("menuitem", { name: "Sincronizar" });
    fireEvent.click(item);
    await waitFor(() => expect(onClick).toHaveBeenCalledOnce());

    // A second click while the first is in flight must not start another run —
    // this is the accidental-double-click guard.
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledOnce();

    release();
  });

  it("renders nothing when every action is unavailable", () => {
    const { container } = renderGroup({
      primary: { id: "view", label: "Ver", allowed: false, onClick: noop },
      actions: [{ id: "edit", label: "Editar", hidden: true, onClick: noop }],
    });
    expect(container).toBeEmptyDOMElement();
  });

  it("portals the menu out of a clipping ancestor", () => {
    // The defect this component was built for: an `overflow-hidden` wrapper —
    // a table container, a card — clipped the previous dropdown. The menu must
    // land on document.body, outside that box.
    render(
      <MemoryRouter>
        <div style={{ overflow: "hidden" }} data-testid="clipper">
          <ActionGroup primary={{ id: "view", label: "Ver", onClick: noop }} actions={[{ id: "edit", label: "Editar", onClick: noop }]} />
        </div>
      </MemoryRouter>,
    );

    const menu = openMenu();
    expect(screen.getByTestId("clipper").contains(menu)).toBe(false);
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveStyle({ position: "fixed" });
  });
});
