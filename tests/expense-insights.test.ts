import { describe, expect, it } from "vitest";
import {
  buildExpenseCategoryBreakdown,
  buildIncomeSourceBreakdown,
  buildMonthlyExpenseIncomeSnapshot,
  summarizeRecurringStatus,
} from "@/lib/expense-insights";
import type { Expense, Income } from "@/lib/types";

const EXPENSE_CATEGORIES = [
  { key: "food", label: "Food", icon: "restaurant", color: "#F59E0B" },
  { key: "bills", label: "Bills", icon: "flash", color: "#EF4444" },
];

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "exp-1",
    userId: "user-1",
    category: "food",
    amount: 100,
    note: "",
    date: "2026-02-10T00:00:00.000Z",
    createdAt: "2026-02-10T00:00:00.000Z",
    recurrence: "none",
    recurrenceEndDate: null,
    paidMonths: [],
    ...overrides,
  };
}

function income(overrides: Partial<Income> = {}): Income {
  return {
    id: "inc-1",
    userId: "user-1",
    source: "Salary",
    amount: 1000,
    note: "",
    date: "2026-02-10T00:00:00.000Z",
    createdAt: "2026-02-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("expense insights", () => {
  it("builds current-month totals and counts from mixed-month entries", () => {
    const snapshot = buildMonthlyExpenseIncomeSnapshot({
      monthKey: "2026-02",
      expenses: [
        expense({ id: "e-cur", amount: 200, date: "2026-02-16" }),
        expense({ id: "e-prev", amount: 999, date: "2026-01-16" }),
      ],
      incomes: [
        income({ id: "i-cur", amount: 1500, date: "2026-02-11" }),
        income({ id: "i-prev", amount: 700, date: "2026-01-11" }),
      ],
    });

    expect(snapshot.monthlyExpenseTotal).toBe(200);
    expect(snapshot.monthlyIncomeTotal).toBe(1500);
    expect(snapshot.monthlyNetCashflow).toBe(1300);
    expect(snapshot.monthlyExpenseCount).toBe(1);
    expect(snapshot.monthlyIncomeCount).toBe(1);
  });

  it("summarizes recurring paid/unpaid status and unpaid due amount", () => {
    const summary = summarizeRecurringStatus([
      { amount: 1000, isActive: true, isPaid: true },
      { amount: 400, isActive: true, isPaid: false },
      { amount: 200, isActive: false, isPaid: false },
    ]);

    expect(summary.activeRecurringCount).toBe(2);
    expect(summary.paidRecurringCount).toBe(1);
    expect(summary.unpaidRecurringCount).toBe(1);
    expect(summary.unpaidRecurringAmount).toBe(400);
  });

  it("ranks monthly expense categories by amount with share", () => {
    const rows = buildExpenseCategoryBreakdown({
      expenses: [
        expense({ id: "food-1", category: "food", amount: 300 }),
        expense({ id: "food-2", category: "food", amount: 200 }),
        expense({ id: "bills-1", category: "bills", amount: 500 }),
      ],
      categories: EXPENSE_CATEGORIES,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].key).toBe("food");
    expect(rows[0].amount).toBe(500);
    expect(rows[0].share).toBe(0.5);
    expect(rows[1].key).toBe("bills");
    expect(rows[1].share).toBe(0.5);
  });

  it("groups income sources case-insensitively and trims names", () => {
    const rows = buildIncomeSourceBreakdown({
      incomes: [
        income({ id: "salary-1", source: "Salary", amount: 1000 }),
        income({ id: "salary-2", source: " salary ", amount: 500 }),
        income({ id: "empty-1", source: "  ", amount: 250 }),
      ],
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe("Salary");
    expect(rows[0].amount).toBe(1500);
    expect(rows[1].label).toBe("Other");
    expect(rows[1].amount).toBe(250);
  });

  it("returns empty breakdowns for empty month data", () => {
    expect(
      buildExpenseCategoryBreakdown({
        expenses: [],
        categories: EXPENSE_CATEGORIES,
      })
    ).toEqual([]);
    expect(buildIncomeSourceBreakdown({ incomes: [] })).toEqual([]);
  });
});
