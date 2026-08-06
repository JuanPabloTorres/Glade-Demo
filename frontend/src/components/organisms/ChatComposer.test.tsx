import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatComposer } from "./ChatComposer";
import type { AssistantAction } from "../../types/bankruptcy";

const firstAction: AssistantAction = { id: "a1", label: "Revisar el resumen financiero completo.", icon: "chat", action_type: "ask" };
const actions: AssistantAction[] = [
  firstAction,
  { id: "a2", label: "¿Qué documentos me faltan?", icon: "chat", action_type: "ask" },
];

describe("ChatComposer", () => {
  it("renders a suggested-action button per AssistantAction and forwards it on click", () => {
    const onSelectAction = vi.fn();
    render(
      <ChatComposer
        value=""
        onChange={() => {}}
        onSubmit={(event) => event.preventDefault()}
        suggestedActions={actions}
        onSelectAction={onSelectAction}
        busy={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: firstAction.label }));
    expect(onSelectAction).toHaveBeenCalledWith(actions[0]);
  });

  it("renders no suggested-action row when there are none", () => {
    render(
      <ChatComposer value="" onChange={() => {}} onSubmit={() => {}} suggestedActions={[]} onSelectAction={() => {}} busy={false} />,
    );
    expect(screen.queryByRole("button", { name: firstAction.label })).toBeNull();
  });

  it("disables send while empty and shows the loading label while busy", () => {
    const { rerender } = render(
      <ChatComposer value="" onChange={() => {}} onSubmit={() => {}} suggestedActions={[]} onSelectAction={() => {}} busy={false} />,
    );
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();

    rerender(
      <ChatComposer value="Hola" onChange={() => {}} onSubmit={() => {}} suggestedActions={[]} onSelectAction={() => {}} busy={true} />,
    );
    expect(screen.getByRole("button", { name: /Analizando/ })).toBeDisabled();
  });

  it("calls onChange as the user types", () => {
    const onChange = vi.fn();
    render(
      <ChatComposer value="" onChange={onChange} onSubmit={() => {}} suggestedActions={[]} onSelectAction={() => {}} busy={false} />,
    );
    fireEvent.change(screen.getByPlaceholderText("Ej. ¿Qué documentos me faltan?"), { target: { value: "¿Qué me falta?" } });
    expect(onChange).toHaveBeenCalledWith("¿Qué me falta?");
  });
});
