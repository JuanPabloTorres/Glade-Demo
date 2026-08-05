import { describe, expect, it } from "vitest";
import { buildPath, getEndpoint } from "./endpointRegistry";
describe("endpointRegistry", () => {
    it("builds the exact backend path and preserves trace metadata", () => {
        expect(buildPath("conflicts.resolve", { matter_id: "matter-1", conflict_id: "conflict-2" })).toBe("/api/v1/matters/matter-1/conflicts/conflict-2/resolve");
        expect(getEndpoint("conflicts.resolve").controller).toBe("ConflictController");
        expect(getEndpoint("conflicts.resolve").action).toBe("resolve_conflict");
    });
});
