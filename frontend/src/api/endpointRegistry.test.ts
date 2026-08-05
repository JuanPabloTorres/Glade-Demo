import { describe, expect, it } from "vitest";
import { buildPath, getEndpoint } from "./endpointRegistry";

describe("endpointRegistry", () => {
  it("builds the exact backend path from client-safe contract metadata", () => {
    expect(
      buildPath("conflicts.resolve", {
        matter_id: "matter-1",
        conflict_id: "conflict-2",
      }),
    ).toBe("/api/v1/matters/matter-1/conflicts/conflict-2/resolve");
    expect(getEndpoint("conflicts.resolve")).toEqual({
      operationId: "resolveConflict",
      method: "POST",
      path: "/api/v1/matters/{matter_id}/conflicts/{conflict_id}/resolve",
    });
  });

  it("fails fast when a required path parameter is missing", () => {
    expect(() => buildPath("matters.get")).toThrow("matter_id");
  });
});
