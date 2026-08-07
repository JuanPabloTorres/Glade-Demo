import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BankruptcyEntryModal } from "./BankruptcyEntryModal";

function renderEvidenceModal(onSave = vi.fn()) {
  const onClose = vi.fn();
  render(<BankruptcyEntryModal open kind="evidence" onClose={onClose} onSave={onSave} />);
  return { onSave, onClose };
}

describe("BankruptcyEntryModal — Add Evidence", () => {
  it("blocks submit and reports each missing field inline, next to the field", async () => {
    const { onSave, onClose } = renderEvidenceModal();

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    // The message must be wired to the control it belongs to, not floated in
    // a page-level alert — that association is the whole point of inline
    // validation for a screen-reader user.
    const type = screen.getByLabelText("Tipo de evidencia");
    expect(type).toHaveAttribute("aria-invalid", "true");
    const describedBy = type.getAttribute("aria-describedby");
    expect(describedBy).toBe("evidence-type-error");
    expect(document.getElementById(describedBy!)).toHaveTextContent("obligatorio");
  });

  it("clears a field's error as soon as it is filled in", async () => {
    renderEvidenceModal();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(2));

    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "talon.pdf" } });

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
    expect(screen.getByLabelText("Nombre del documento")).not.toHaveAttribute("aria-invalid");
  });

  it("submits the unchanged evidence payload once the required fields are present", async () => {
    const onSave = vi.fn();
    const { onClose } = renderEvidenceModal(onSave);

    fireEvent.change(screen.getByLabelText("Tipo de evidencia"), { target: { value: "pay-stubs" } });
    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "talon.pdf" } });
    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "reviewed" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const submission = onSave.mock.calls[0]![0];
    expect(submission).toMatchObject({
      kind: "evidence",
      value: {
        evidenceType: "pay-stubs",
        name: "talon.pdf",
        status: "reviewed",
        relatedEntryIds: [],
      },
    });
    expect(submission.value.id).toMatch(/^evidence-/);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("does not submit twice when the action is activated repeatedly", async () => {
    // A save that never settles holds the modal in its submitting state, which
    // is exactly the window a double-click has to slip through.
    const onSave = vi.fn(() => new Promise<void>(() => {}));
    renderEvidenceModal(onSave);

    fireEvent.change(screen.getByLabelText("Tipo de evidencia"), { target: { value: "pay-stubs" } });
    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "talon.pdf" } });

    const save = screen.getByRole("button", { name: /Guardar|Guardando/ });
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.click(save);

    await waitFor(() => expect(screen.getByRole("button", { name: /Guardando/ })).toBeDisabled());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("surfaces a form-level message when the save fails, and stays open for a retry", async () => {
    const onSave = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(undefined);
    const { onClose } = renderEvidenceModal(onSave);

    fireEvent.change(screen.getByLabelText("Tipo de evidencia"), { target: { value: "pay-stubs" } });
    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "talon.pdf" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(screen.getByText(/No pudimos guardar/)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();

    // The lock must release on failure, or the form would be permanently dead.
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("names the document after a chosen file, and keeps the attachment when the name is edited", async () => {
    renderEvidenceModal();
    const file = new File(["x"], "estado-bancario-marzo.pdf", { type: "application/pdf" });

    fireEvent.change(screen.getByLabelText("Archivo"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByLabelText("Nombre del documento")).toHaveValue("estado-bancario-marzo.pdf"));
    expect(screen.getByTitle("estado-bancario-marzo.pdf")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "Estado de marzo" } });

    // Renaming the entry must not detach the file it describes.
    expect(screen.getByTitle("estado-bancario-marzo.pdf")).toBeInTheDocument();
  });
});
