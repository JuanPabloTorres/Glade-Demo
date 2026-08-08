import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { useCaseStageNavigation } from "./useCaseStageNavigation";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return { ...actual, useNavigate: () => mockNavigate };
});

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

function navigation(options: { section?: string; isAttorney?: boolean; caseId?: string } = {}) {
  // `"caseId" in options` rather than `options.caseId ?? "case-1"`: the default
  // would turn an explicitly-passed `undefined` back into a real id, and the
  // one test that needs a missing case would silently assert nothing.
  const caseId = "caseId" in options ? options.caseId : "case-1";
  return renderHook(
    () =>
      useCaseStageNavigation({
        caseId,
        section: options.section,
        isAttorney: options.isAttorney ?? false,
      }),
    { wrapper },
  );
}

// These three rules were buried in a 640-line component. Extracting them is
// only worth anything if they can now be asserted directly, which is what this
// file does.
describe("useCaseStageNavigation", () => {
  describe("which stages exist", () => {
    it("gives a client the base stages and no attorney review", () => {
      const { result } = navigation();

      expect(result.current.stageOrder).toContain("start");
      expect(result.current.stageOrder).not.toContain("attorney-review");
    });

    it("appends attorney review for an attorney, so the stepper index matches what renders", () => {
      const { result } = navigation({ isAttorney: true });

      expect(result.current.stageOrder.at(-1)).toBe("attorney-review");
    });
  });

  describe("which stage the URL opens", () => {
    it("resolves a section slug to its stage", () => {
      expect(navigation({ section: "debts" }).result.current.activeStage).toBe("debts");
    });

    it("maps the URL vocabulary to the internal one where they differ", () => {
      // "tasks" and "activity" read better in a URL than "review" and "tracking".
      expect(navigation({ section: "tasks" }).result.current.activeStage).toBe("review");
      expect(navigation({ section: "activity" }).result.current.activeStage).toBe("tracking");
    });

    it("falls back to the overview for an unknown slug rather than rendering nothing", () => {
      expect(navigation({ section: "not-a-section" }).result.current.activeStage).toBe("start");
      expect(navigation({ section: undefined }).result.current.activeStage).toBe("start");
    });

    it("sends a client who deep-links into attorney review to the overview", () => {
      // The slug is valid; the stage is simply not one this role can reach.
      // Without this the client would land on a stage whose content never renders.
      expect(navigation({ section: "attorney-review" }).result.current.activeStage).toBe("start");
    });

    it("lets an attorney open attorney review through the same slug", () => {
      expect(
        navigation({ section: "attorney-review", isAttorney: true }).result.current.activeStage,
      ).toBe("attorney-review");
    });
  });

  describe("navigating", () => {
    it("changes the URL, which is what makes reload and back behave like a click", () => {
      mockNavigate.mockClear();
      navigation().result.current.navigateToStage("expenses");

      expect(mockNavigate).toHaveBeenCalledWith("/case/case-1/expenses");
    });

    it("redirects a stage the role cannot reach to the overview instead of a dead URL", () => {
      mockNavigate.mockClear();
      navigation().result.current.navigateToStage("attorney-review");

      expect(mockNavigate).toHaveBeenCalledWith("/case/case-1/overview");
    });

    it("does nothing without a case id, rather than navigating to a malformed path", () => {
      mockNavigate.mockClear();
      navigation({ caseId: undefined }).result.current.navigateToStage("debts");

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
