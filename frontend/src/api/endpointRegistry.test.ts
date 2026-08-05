import { describe, expect, it } from "vitest";
import { buildPath, getEndpoint } from "./endpointRegistry";

describe("endpointRegistry", () => {
  it("builds the bankruptcy analysis path from client-safe contract metadata", () => {
    expect(buildPath("bankruptcy.analyze")).toBe("/api/v1/bankruptcy/analyze");
    expect(getEndpoint("bankruptcy.analyze")).toEqual({
      operationId: "analyzeBankruptcyCase",
      method: "POST",
      path: "/api/v1/bankruptcy/analyze",
    });
  });

  it("exposes the bankruptcy guidance operation", () => {
    expect(buildPath("bankruptcy.guide")).toBe("/api/v1/bankruptcy/guide");
    expect(getEndpoint("bankruptcy.guide")).toEqual({
      operationId: "guideBankruptcyCase",
      method: "POST",
      path: "/api/v1/bankruptcy/guide",
    });
  });
});
