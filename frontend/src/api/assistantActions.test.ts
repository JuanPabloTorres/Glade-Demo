import { describe, expect, it } from "vitest";
import {
  allowedAssistantActions,
  assistantActionHref,
  isAllowedAssistantAction,
} from "./assistantActions";
import type { AssistantAction } from "../types/bankruptcy";

function action(overrides: Partial<AssistantAction> = {}): AssistantAction {
  return {
    id: "a1",
    action_type: "open_page",
    resource: "evidence",
    label: "Evidencia",
    icon: "document",
    payload: {},
    requires_confirmation: false,
    ...overrides,
  };
}

describe("assistant action allow-list", () => {
  it("keeps actions naming a known workspace section", () => {
    expect(isAllowedAssistantAction(action())).toBe(true);
  });

  it.each(["billing", "../../admin/users", "https://evil.example", "", "users"])(
    "rejects the invented resource %j",
    (resource) => {
      expect(isAllowedAssistantAction(action({ resource }))).toBe(false);
    },
  );

  it("drops disallowed actions rather than coercing them to a default", () => {
    const kept = allowedAssistantActions([
      action({ id: "ok" }),
      action({ id: "bad", resource: "billing" }),
    ]);
    expect(kept.map((item) => item.id)).toEqual(["ok"]);
  });

  it("builds a workspace link for an allowed action", () => {
    expect(assistantActionHref("case-1", action())).toBe("/case/case-1?focus=evidence");
  });

  it("returns null instead of a partial URL for a disallowed action", () => {
    expect(assistantActionHref("case-1", action({ resource: "billing" }))).toBeNull();
  });

  it("encodes a case id that would otherwise escape the path segment", () => {
    expect(assistantActionHref("case/../admin", action())).toBe(
      "/case/case%2F..%2Fadmin?focus=evidence",
    );
  });
});
