import { render, screen } from "@testing-library/react";
import i18n from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { LANGUAGE_STORAGE_KEY } from "../../i18n/languages";
import type { TimelineEvent } from "../../types/bankruptcy";
import { CaseTimeline } from "./CaseTimeline";

function event(overrides: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: "timeline-1",
    stage: "request",
    title: "Solicitud iniciada",
    description: "Se creó un expediente privado de evaluación.",
    titleKey: "timeline.requestStartedTitle",
    descriptionKey: "timeline.requestStartedDescription",
    status: "current",
    createdAt: "2026-08-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("CaseTimeline", () => {
  // `isolate: false` shares one environment per worker, so a suite that leaves
  // the language switched would change what the next file renders.
  afterEach(async () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    await i18n.changeLanguage("es");
  });

  it("renders keyed entries in the session language", () => {
    render(<CaseTimeline events={[event()]} />);

    expect(screen.getByText("Solicitud iniciada")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
  });

  // The defect this component carried: the workspace generated Spanish prose at
  // creation time and froze it into localStorage, so an English session read the
  // whole history in Spanish and switching language changed nothing.
  it("re-labels an already-created entry when the language changes", async () => {
    const { rerender } = render(<CaseTimeline events={[event()]} />);
    expect(screen.getByText("Solicitud iniciada")).toBeInTheDocument();

    await i18n.changeLanguage("en");
    rerender(<CaseTimeline events={[event()]} />);

    expect(screen.getByText("Request started")).toBeInTheDocument();
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.queryByText("Solicitud iniciada")).toBeNull();
  });

  it("falls back to the stored text for an entry persisted before the keys existed", () => {
    render(
      <CaseTimeline
        events={[
          event({ titleKey: undefined, descriptionKey: undefined, title: "Etapa antigua", description: "Texto viejo" }),
        ]}
      />,
    );

    expect(screen.getByText("Etapa antigua")).toBeInTheDocument();
    expect(screen.getByText("Texto viejo")).toBeInTheDocument();
  });

  it("shows an attorney's own note verbatim instead of translating it", async () => {
    const note = "Falta el estado de cuenta hipotecario de julio.";
    render(
      <CaseTimeline
        events={[
          event({
            stage: "attorney_review",
            titleKey: "timeline.statusChangedTitle",
            descriptionKey: undefined,
            description: note,
          }),
        ]}
      />,
    );

    expect(screen.getByText(note)).toBeInTheDocument();

    await i18n.changeLanguage("en");
    expect(screen.getByText(note)).toBeInTheDocument();
  });

  it("interpolates the status label in the session language, not the one it was recorded in", async () => {
    const statusChange = event({
      stage: "attorney_review",
      titleKey: "timeline.statusChangedTitle",
      descriptionKey: "timeline.statusChangedDescription",
      descriptionParams: { statusKey: "attorney_review" },
    });

    const { rerender } = render(<CaseTimeline events={[statusChange]} />);
    expect(screen.getByText("El expediente cambió a Revisión del abogado.")).toBeInTheDocument();

    await i18n.changeLanguage("en");
    rerender(<CaseTimeline events={[statusChange]} />);

    expect(screen.getByText("The case moved to Attorney review.")).toBeInTheDocument();
  });

  // `formatDate` resolves its locale from LANGUAGE_STORAGE_KEY rather than from
  // i18next, so this test switches both — which is exactly what
  // `LanguageProvider` does: one effect writes the key and calls
  // `changeLanguage` together, and they are only ever in sync because of it.
  it("formats the date for the session locale rather than a hardcoded one", async () => {
    const { rerender } = render(<CaseTimeline events={[event()]} />);
    // es-PR renders "5 de agosto de 2026"; en-US renders "August 5, 2026".
    expect(screen.getByText(/agosto/)).toBeInTheDocument();

    localStorage.setItem(LANGUAGE_STORAGE_KEY, "en");
    await i18n.changeLanguage("en");
    rerender(<CaseTimeline events={[event()]} />);
    expect(screen.getByText(/August/)).toBeInTheDocument();
  });
});
