import { beforeEach, describe, expect, it } from "vitest";
import { demoMatterApi, GUIDED_DEMO_MATTER_ID } from "./demoMatterApi";

describe("demoMatterApi", () => {
  beforeEach(() => {
    window.localStorage.clear();
    demoMatterApi.reset();
  });

  it("always provides a guided matter with a visible human decision", async () => {
    const matters = await demoMatterApi.listMatters();
    const guided = matters.find((matter) => matter.id === GUIDED_DEMO_MATTER_ID);

    expect(guided).toBeDefined();
    expect(guided?.open_conflicts).toBe(1);
    expect(guided?.readiness_score).toBeGreaterThan(0);
    expect(guided?.readiness_score).toBeLessThan(100);
  });

  it("persists a created matter and its workflow in browser storage", async () => {
    const created = await demoMatterApi.createMatter({
      display_name: "Jordan Example",
      case_type: "general",
      email: "jordan@example.com",
      phone: "787-555-0199",
      assigned_to: "Demo Reviewer",
    });

    await demoMatterApi.updateIntake(created.id, {
      display_name: "Jordan Example",
      email: "jordan@example.com",
      phone: "787-555-0199",
      address: "10 Example Avenue",
      date_of_birth: "1992-05-03",
      summary: "Prepare the matter for professional review.",
    });

    await demoMatterApi.createDocument(created.id, {
      original_name: "identity.txt",
      document_type: "identity",
      content: "Name: Jordan Example\nEmail: jordan@example.com\nPhone: 787-555-0199",
    });

    const restored = await demoMatterApi.getMatter(created.id);
    const readiness = await demoMatterApi.getReadiness(created.id);

    expect(restored.display_name).toBe("Jordan Example");
    expect(readiness.score).toBe(100);
  });

  it("records a human decision and keeps the guided matter available", async () => {
    const conflicts = await demoMatterApi.listConflicts(GUIDED_DEMO_MATTER_ID);
    expect(conflicts).toHaveLength(1);

    await demoMatterApi.resolveConflict(
      GUIDED_DEMO_MATTER_ID,
      conflicts[0].id,
      conflicts[0].canonical_value,
    );

    const refreshed = await demoMatterApi.getMatter(GUIDED_DEMO_MATTER_ID);
    const openConflicts = (await demoMatterApi.listConflicts(GUIDED_DEMO_MATTER_ID)).filter(
      (conflict) => conflict.status === "open",
    );

    expect(refreshed.id).toBe(GUIDED_DEMO_MATTER_ID);
    expect(openConflicts).toHaveLength(0);
  });
});
