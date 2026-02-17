import { describe, expect, it } from "vitest";
import { beginLoadGuard, isLoadGuardActive } from "@/lib/load-guards";

describe("load guard", () => {
  it("accepts responses for the current active user session", () => {
    const activeLoadIdRef = { current: 0 };
    const guard = beginLoadGuard(activeLoadIdRef, "user-new");

    expect(
      isLoadGuardActive(activeLoadIdRef, "user-new", guard)
    ).toBe(true);
  });

  it("rejects stale responses after a newer load starts", () => {
    const activeLoadIdRef = { current: 0 };
    const oldGuard = beginLoadGuard(activeLoadIdRef, "user-1");

    beginLoadGuard(activeLoadIdRef, "user-1");

    expect(
      isLoadGuardActive(activeLoadIdRef, "user-1", oldGuard)
    ).toBe(false);
  });

  it("rejects stale responses from a signed-out or switched user", () => {
    const activeLoadIdRef = { current: 0 };
    const oldGuard = beginLoadGuard(activeLoadIdRef, "user-old");

    expect(isLoadGuardActive(activeLoadIdRef, null, oldGuard)).toBe(false);

    const newGuard = beginLoadGuard(activeLoadIdRef, "user-new");

    expect(
      isLoadGuardActive(activeLoadIdRef, "user-new", oldGuard)
    ).toBe(false);
    expect(
      isLoadGuardActive(activeLoadIdRef, "user-new", newGuard)
    ).toBe(true);
  });
});
