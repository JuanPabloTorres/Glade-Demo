import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthContext";
import { LANGUAGE_STORAGE_KEY } from "../../i18n/languages";
import { LanguageProvider } from "../../i18n/LanguageContext";
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

// ChatBubble reads locale via useLanguage(), which throws outside a
// LanguageProvider — and LanguageProvider itself reads useAuth(), so both
// ancestors are required, mirroring main.tsx's provider order.
function renderBubble(element: ReactElement) {
  return render(
    <AuthProvider>
      <LanguageProvider>{element}</LanguageProvider>
    </AuthProvider>,
  );
}

describe("ChatBubble", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    // Pin the resolved language to Spanish so assertions don't depend on
    // jsdom's navigator.language (which defaults to en-US and would
    // otherwise silently switch every t() call in this file to English).
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "es");
  });

  afterEach(() => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
  });

  it("renders the message content", () => {
    renderBubble(<ChatBubble message={message()} />);
    expect(screen.getByText("La plantilla financiera está completa.")).toBeInTheDocument();
  });

  it("labels the user's own messages distinctly from the assistant's", () => {
    const { rerender, container } = renderBubble(<ChatBubble message={message({ role: "assistant" })} />);
    const assistantAvatar = container.querySelector('[class*="rounded-full"]');
    expect(assistantAvatar).toBeTruthy();

    rerender(
      <AuthProvider>
        <LanguageProvider>
          <ChatBubble message={message({ role: "user", content: "¿Qué me falta?" })} />
        </LanguageProvider>
      </AuthProvider>,
    );
    expect(screen.getByText("¿Qué me falta?")).toBeInTheDocument();
  });

  it("copies its text to the clipboard when the copy control is used", async () => {
    renderBubble(<ChatBubble message={message()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copiar texto al portapapeles" }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("La plantilla financiera está completa.");
  });
});
