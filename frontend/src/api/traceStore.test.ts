import { beforeEach, describe, expect, it } from "vitest";
import {
  clearApiTraces,
  getApiTraceSnapshot,
  recordApiTrace,
} from "./traceStore";

describe("traceStore", () => {
  beforeEach(clearApiTraces);

  it("stores controller and action metadata returned by the backend", () => {
    recordApiTrace({
      operationId: "resolveConflict",
      method: "POST",
      path: "/api/v1/matters/m1/conflicts/c1/resolve",
      controller: "ConflictController",
      action: "resolve_conflict",
      traceMatch: "true",
      status: 200,
    });

    expect(getApiTraceSnapshot()[0]).toMatchObject({
      operationId: "resolveConflict",
      controller: "ConflictController",
      action: "resolve_conflict",
      traceMatch: "true",
    });
  });
});
