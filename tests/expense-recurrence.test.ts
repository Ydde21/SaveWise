import { describe, expect, it } from "vitest";
import {
  buildEffectiveExpenses,
  getUtcMonthKey,
  upsertPaidMonth,
} from "@/lib/expense-recurrence";
import type { Expense } from "@/lib/types";

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "exp-1",
    userId: "user-1",
    category: "bills",
    amount: 100,
    note: "",
    date: "2026-01-01",
    createdAt: "2026-01-01T00:00:00.000Z",
    recurrence: "none",
    recurrenceEndDate: null,
    paidMonths: [],
    ...overrides,
  };
}

describe("expense recurrence ledger", () => {
  it("expands recurring expenses into paid monthly ledger rows", () => {
    const ledger = buildEffectiveExpenses([
      expense({ id: "one-time", amount: 50, date: "2026-02-10", category: "food" }),
      expense({
        id: "rent",
        amount: 1000,
        date: "2026-01-05",
        recurrence: "monthly",
        paidMonths: ["2026-02", "2026-03"],
      }),
    ]);

    expect(ledger).toHaveLength(3);
    expect(ledger.some((item) => item.id === "one-time")).toBe(true);
    expect(ledger.some((item) => item.id === "rent:2026-02")).toBe(true);
    expect(ledger.some((item) => item.id === "rent:2026-03")).toBe(true);
  });

  it("skips paid months outside recurring active range", () => {
    const ledger = buildEffectiveExpenses([
      expense({
        id: "insurance",
        date: "2026-01-10",
        recurrence: "monthly",
        recurrenceEndDate: "2026-02-28",
        paidMonths: ["2025-12", "2026-01", "2026-03"],
      }),
    ]);

    expect(ledger).toHaveLength(1);
    expect(ledger[0].id).toBe("insurance:2026-01");
  });

  it("adds and removes paid months idempotently", () => {
    const added = upsertPaidMonth(["2026-02", "2026-02"], "2026-03", true);
    expect(added).toEqual(["2026-02", "2026-03"]);

    const removed = upsertPaidMonth(added, "2026-02", false);
    expect(removed).toEqual(["2026-03"]);
  });

  it("resolves month keys from date-only values in UTC format", () => {
    expect(getUtcMonthKey("2026-02-16")).toBe("2026-02");
    expect(getUtcMonthKey("2026-02-16T05:00:00.000Z")).toBe("2026-02");
  });
});
