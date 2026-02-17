import { describe, expect, it } from "vitest";
import { calculateMonthlyPayment } from "@/lib/interest";
import { buildReportSnapshot } from "@/lib/reporting";

function wallet(overrides: Record<string, unknown> = {}) {
  return {
    id: "wallet-1",
    userId: "user-1",
    name: "Main",
    balance: 1000,
    interestRate: 5,
    compoundingFrequency: "monthly" as const,
    currency: "USD",
    color: "#0D6E4F",
    icon: "wallet",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function income(id: string, amount: number, date: string) {
  return {
    id,
    userId: "user-1",
    source: "Salary",
    amount,
    note: "",
    date,
    createdAt: date,
  };
}

function expense(id: string, amount: number, date: string, category: string) {
  return {
    id,
    userId: "user-1",
    category,
    amount,
    note: "",
    date,
    createdAt: date,
  };
}

function loanPayment(id: string, amount: number, paymentDate: string) {
  return {
    id,
    userId: "user-1",
    loanId: "loan-1",
    amount,
    paymentDate,
    note: "",
    createdAt: paymentDate,
  };
}

function loan(overrides: Record<string, unknown> = {}) {
  return {
    id: "loan-1",
    userId: "user-1",
    lender: "Bank",
    principal: 1200,
    interestRate: 0,
    termMonths: 12,
    startDate: "2026-01-01T00:00:00.000Z",
    balance: 1200,
    monthlyPayment: null,
    color: "#EF4444",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function goal(
  id: string,
  name: string,
  targetAmount: number,
  currentAmount: number,
  deadline: string = "2026-04-15T00:00:00.000Z",
  walletId: string | null = null
) {
  return {
    id,
    userId: "user-1",
    name,
    targetAmount,
    currentAmount,
    deadline,
    walletId,
    icon: "flag",
    color: "#0D6E4F",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const AS_OF = new Date("2026-02-16T00:00:00.000Z");

describe("reporting engine", () => {
  it("uses UTC YYYY-MM month keys and equal-length previous windows", () => {
    const snapshot = buildReportSnapshot({
      range: "3M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [],
      expenses: [],
      loans: [],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.monthKeys).toEqual(["2025-12", "2026-01", "2026-02"]);
    expect(snapshot.previousMonthKeys).toEqual(["2025-09", "2025-10", "2025-11"]);
    expect(snapshot.monthKeys.every((key) => /^\d{4}-\d{2}$/.test(key))).toBe(true);
  });

  it("applies 1M month-to-date semantics for current month only", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [
        income("cur-included", 100, "2026-02-10T00:00:00.000Z"),
        income("cur-excluded", 200, "2026-02-20T00:00:00.000Z"),
        income("prev-month", 300, "2026-01-10T00:00:00.000Z"),
      ],
      expenses: [],
      loans: [],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.totalsCurrent.income).toBe(100);
    expect(snapshot.totalsPrevious.income).toBe(300);
  });

  it("includes date-only current-day entries using calendar-day cutoff", () => {
    const asOfLocalMorning = new Date(2026, 1, 16, 7, 21, 0, 0);
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: asOfLocalMorning,
      wallets: [wallet()],
      incomes: [
        {
          ...income("inc-date-only", 500, "2026-02-16"),
          date: "2026-02-16",
        },
      ],
      expenses: [
        {
          ...expense("exp-date-only", 200, "2026-02-16", "food"),
          date: "2026-02-16",
        },
      ],
      loans: [],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.totalsCurrent.income).toBe(500);
    expect(snapshot.totalsCurrent.expenses).toBe(200);
    expect(snapshot.expenseBreakdown.some((slice) => slice.value > 0)).toBe(true);
  });

  it("uses bucket-count averages (not day-weighted) for 3M/6M/12M windows", () => {
    const snapshot = buildReportSnapshot({
      range: "3M",
      asOf: new Date("2026-02-02T00:00:00.000Z"),
      wallets: [wallet()],
      incomes: [income("inc", 300, "2026-02-01T00:00:00.000Z")],
      expenses: [],
      loans: [],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.totalsCurrent.income).toBe(300);
    expect(snapshot.averagesCurrent.income).toBe(100);
  });

  it("computes net flow as income - expenses - loanPayments", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [income("inc", 1000, "2026-02-10T00:00:00.000Z")],
      expenses: [expense("exp", 400, "2026-02-11T00:00:00.000Z", "food")],
      loans: [],
      loanPayments: [loanPayment("pay", 100, "2026-02-12T00:00:00.000Z")],
      goals: [],
    });

    expect(snapshot.totalsCurrent.netFlow).toBe(500);
  });

  it("returns null for income-based ratios when income denominator is zero", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [],
      expenses: [expense("exp", 100, "2026-02-10T00:00:00.000Z", "food")],
      loans: [loan()],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.savingsRate).toBeNull();
    expect(snapshot.expenseToIncomeRatio).toBeNull();
    expect(snapshot.debtServiceRatio).toBeNull();
  });

  it("computes DSR from scheduled obligations for 0% and non-zero APR loans", () => {
    const zeroAprSnapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [income("inc", 1000, "2026-02-10T00:00:00.000Z")],
      expenses: [],
      loans: [loan({ principal: 1200, interestRate: 0, termMonths: 12, balance: 1200 })],
      loanPayments: [],
      goals: [],
    });

    expect(zeroAprSnapshot.scheduledMonthlyLoanPayment).toBe(100);
    expect(zeroAprSnapshot.debtServiceRatio).toBeCloseTo(0.1, 4);

    const nonZeroRate = 12;
    const nonZeroSnapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [income("inc", 1000, "2026-02-10T00:00:00.000Z")],
      expenses: [],
      loans: [loan({ principal: 1200, interestRate: nonZeroRate, termMonths: 12, balance: 1200 })],
      loanPayments: [],
      goals: [],
    });
    const expectedPayment = calculateMonthlyPayment(1200, nonZeroRate, 12);
    expect(nonZeroSnapshot.scheduledMonthlyLoanPayment).toBeCloseTo(expectedPayment, 2);
  });

  it("uses stored monthly payment first and skips invalid or inactive loans", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [income("inc", 2000, "2026-02-10T00:00:00.000Z")],
      expenses: [],
      loans: [
        loan({ id: "loan-valid", monthlyPayment: 150, balance: 900 }),
        loan({ id: "loan-invalid-term", termMonths: 0, balance: 700, monthlyPayment: null }),
        loan({
          id: "loan-future",
          startDate: "2026-03-01T00:00:00.000Z",
          balance: 1000,
          monthlyPayment: 200,
        }),
        loan({
          id: "loan-invalid-rate",
          interestRate: -2,
          monthlyPayment: null,
        }),
      ],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.scheduledMonthlyLoanPayment).toBe(150);
  });

  it("weights APR by current outstanding balances from active loans only", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [income("inc", 1000, "2026-02-10T00:00:00.000Z")],
      expenses: [],
      loans: [
        loan({ id: "loan-a", balance: 1000, interestRate: 10 }),
        loan({ id: "loan-b", balance: 3000, interestRate: 20 }),
        loan({
          id: "loan-future",
          balance: 9999,
          interestRate: 99,
          startDate: "2026-03-01T00:00:00.000Z",
        }),
      ],
      loanPayments: [],
      goals: [],
    });

    expect(snapshot.weightedApr).toBe(17.5);
  });

  it("uses wallet-linked goal balance over goal.currentAmount when walletId is present", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet({ id: "wallet-linked", balance: 900 })],
      incomes: [income("inc", 1000, "2026-02-10T00:00:00.000Z")],
      expenses: [],
      loans: [],
      loanPayments: [],
      goals: [
        goal("goal-linked", "Linked Goal", 1000, 100, "2026-04-01T00:00:00.000Z", "wallet-linked"),
        goal("goal-manual", "Manual Goal", 1000, 200, "2026-04-01T00:00:00.000Z", null),
      ],
    });

    const linkedGoal = snapshot.goalFeasibility.find((item) => item.goalId === "goal-linked");
    const manualGoal = snapshot.goalFeasibility.find((item) => item.goalId === "goal-manual");
    expect(linkedGoal?.currentAmount).toBe(900);
    expect(linkedGoal?.remainingAmount).toBe(100);
    expect(manualGoal?.currentAmount).toBe(200);
  });

  it("rounds monthsUntilDeadline by calendar months (partial months rounded up)", () => {
    const snapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [income("inc", 3000, "2026-02-10T00:00:00.000Z")],
      expenses: [],
      loans: [],
      loanPayments: [],
      goals: [
        goal("goal-1", "Goal 1", 1000, 0, "2026-03-01T00:00:00.000Z"),
        goal("goal-2", "Goal 2", 1000, 0, "2026-04-01T00:00:00.000Z"),
        goal("goal-3", "Goal 3", 1000, 0, "2026-04-17T00:00:00.000Z"),
      ],
    });

    const goal1 = snapshot.goalFeasibility.find((item) => item.goalId === "goal-1");
    const goal2 = snapshot.goalFeasibility.find((item) => item.goalId === "goal-2");
    const goal3 = snapshot.goalFeasibility.find((item) => item.goalId === "goal-3");
    expect(goal1?.monthsLeft).toBe(1);
    expect(goal2?.monthsLeft).toBe(2);
    expect(goal3?.monthsLeft).toBe(3);
  });

  it("triggers and skips insights based on deterministic thresholds", () => {
    const triggerSnapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [
        income("inc-cur", 1000, "2026-02-10T00:00:00.000Z"),
        income("inc-prev", 700, "2026-01-10T00:00:00.000Z"),
      ],
      expenses: [
        expense("exp-food-cur", 700, "2026-02-10T00:00:00.000Z", "food"),
        expense("exp-transport-cur", 200, "2026-02-11T00:00:00.000Z", "transport"),
        expense("exp-prev", 690, "2026-01-10T00:00:00.000Z", "food"),
      ],
      loans: [loan({ principal: 12000, balance: 12000, termMonths: 12, interestRate: 0 })],
      loanPayments: [
        loanPayment("pay-cur", 50, "2026-02-10T00:00:00.000Z"),
        loanPayment("pay-prev", 20, "2026-01-10T00:00:00.000Z"),
      ],
      goals: [goal("goal-off", "Critical Goal", 1000, 0)],
    });
    const triggerIds = triggerSnapshot.insights.map((item) => item.id);
    expect(triggerIds).toContain("low-savings-rate");
    expect(triggerIds).toContain("high-dsr");
    expect(triggerIds).toContain("expense-concentration");
    expect(triggerIds).toContain("goals-off-track");
    expect(triggerIds).toContain("netflow-momentum");

    const skipSnapshot = buildReportSnapshot({
      range: "1M",
      asOf: AS_OF,
      wallets: [wallet()],
      incomes: [],
      expenses: [expense("exp-food", 500, "2026-02-10T00:00:00.000Z", "food")],
      loans: [loan({ principal: 1200, interestRate: 0, termMonths: 12, balance: 1200 })],
      loanPayments: [],
      goals: [],
    });
    const skipIds = skipSnapshot.insights.map((item) => item.id);
    expect(skipIds).not.toContain("low-savings-rate");
    expect(skipIds).not.toContain("high-dsr");
  });
});
