import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatBubble } from "./ChatBubble";
import type { ChatMessage } from "../../types/bankruptcy";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "message-1",
    role: "assistant",
    content: "La plantilla financiera está completa.",
    createdAt: "2026-08-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("ChatBubble", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("renders the message content", () => {
    render(<ChatBubble message={message()} />);
    expect(screen.getByText("La plantilla financiera está completa.")).toBeInTheDocument();
  });

  it("labels the user's own messages distinctly from the assistant's", () => {
    const { rerender, container } = render(<ChatBubble message={message({ role: "assistant" })} />);
    const assistantAvatar = container.querySelector('[class*="rounded-full"]');
    expect(assistantAvatar).toBeTruthy();

    rerender(<ChatBubble message={message({ role: "user", content: "¿Qué me falta?" })} />);
    expect(screen.getByText("¿Qué me falta?")).toBeInTheDocument();
  });

  it("copies its text to the clipboard when the copy control is used", async () => {
    render(<ChatBubble message={message()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar texto al portapapeles" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("La plantilla financiera está completa.");
  });
});
