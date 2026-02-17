import { describe, expect, it } from "vitest";
import {
  beginLoadGuard,
  beginScopedLoadGuard,
  isLoadGuardActive,
  isScopedLoadGuardActive,
} from "@/lib/load-guards";

describe("load guard", () => {
  it("accepts responses for the current active user session", () => {
    const activeLoadIdRef = { current: 0 };
    const guard = beginLoadGuard(activeLoadIdRef, "user-new");

    expect(isLoadGuardActive(activeLoadIdRef, "user-new", guard)).toBe(true);
  });

  it("rejects stale responses after a newer load starts", () => {
    const activeLoadIdRef = { current: 0 };
    const oldGuard = beginLoadGuard(activeLoadIdRef, "user-1");

    beginLoadGuard(activeLoadIdRef, "user-1");

    expect(isLoadGuardActive(activeLoadIdRef, "user-1", oldGuard)).toBe(false);
  });

  it("rejects stale responses from a signed-out or switched user", () => {
    const activeLoadIdRef = { current: 0 };
    const oldGuard = beginLoadGuard(activeLoadIdRef, "user-old");

    expect(isLoadGuardActive(activeLoadIdRef, null, oldGuard)).toBe(false);

    const newGuard = beginLoadGuard(activeLoadIdRef, "user-new");

    expect(isLoadGuardActive(activeLoadIdRef, "user-new", oldGuard)).toBe(false);
    expect(isLoadGuardActive(activeLoadIdRef, "user-new", newGuard)).toBe(true);
  });
});

describe("scoped load guard", () => {
  it("allows concurrent loads in different scopes", () => {
    const scopedRef = { current: { wallets: 0, transactions: 0 } };

    const walletsGuard = beginScopedLoadGuard(scopedRef, "wallets", "user-1");
    const transactionsGuard = beginScopedLoadGuard(
      scopedRef,
      "transactions",
      "user-1"
    );

    expect(
      isScopedLoadGuardActive(scopedRef, "wallets", "user-1", walletsGuard)
    ).toBe(true);
    expect(
      isScopedLoadGuardActive(
        scopedRef,
        "transactions",
        "user-1",
        transactionsGuard
      )
    ).toBe(true);
  });

  it("invalidates only older loads within the same scope", () => {
    const scopedRef = { current: { wallets: 0, transactions: 0 } };

    const oldWalletsGuard = beginScopedLoadGuard(scopedRef, "wallets", "user-1");
    const newWalletsGuard = beginScopedLoadGuard(scopedRef, "wallets", "user-1");

    expect(
      isScopedLoadGuardActive(scopedRef, "wallets", "user-1", oldWalletsGuard)
    ).toBe(false);
    expect(
      isScopedLoadGuardActive(scopedRef, "wallets", "user-1", newWalletsGuard)
    ).toBe(true);
  });

  it("still rejects stale scoped responses after session change", () => {
    const scopedRef = { current: { wallets: 0 } };

    const guard = beginScopedLoadGuard(scopedRef, "wallets", "user-old");

    expect(isScopedLoadGuardActive(scopedRef, "wallets", null, guard)).toBe(false);
    expect(
      isScopedLoadGuardActive(scopedRef, "wallets", "user-new", guard)
    ).toBe(false);
  });
});
