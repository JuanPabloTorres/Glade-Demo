import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IconButton } from "./IconButton";

/**
 * The properties the five hand-written versions each got right separately, now
 * asserted once. These are the ways an icon-only button goes wrong, not a
 * restatement of its markup.
 */
describe("IconButton", () => {
  it("is reachable by its label, since it has no text of its own", () => {
    render(<IconButton icon="close" label="Cerrar el panel" />);

    expect(screen.getByRole("button", { name: "Cerrar el panel" })).toBeInTheDocument();
  });

  it("does not submit the form it sits in", () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <IconButton icon="eye-show" label="Mostrar contraseña" />
      </form>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    // A bare <button> inside a form defaults to type="submit". The login
    // password toggle sits in exactly that position, so a default of "button"
    // is the difference between revealing a password and attempting a login.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps a touch-sized hit area by default", () => {
    render(<IconButton icon="close" label="Cerrar" />);

    expect(screen.getByRole("button", { name: "Cerrar" }).className).toContain("h-11");
  });

  it("lets a call site place it without losing what it is", () => {
    render(<IconButton icon="close" label="Cerrar" className="self-center bg-neutral-primary" />);

    // Placement is the call site's business; the frame and the focus ring are
    // not, so a className must add rather than replace.
    const button = screen.getByRole("button", { name: "Cerrar" });
    expect(button.className).toContain("self-center");
    expect(button.className).toContain("focus-visible:ring-4");
  });

  it("passes native button behaviour through, including disabled", () => {
    const onClick = vi.fn();
    render(<IconButton icon="close" label="Cerrar" disabled onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
