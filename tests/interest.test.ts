import { describe, expect, it } from "vitest";
import {
  calculateMonthlyPayment,
  calculateNetBalance,
  futureValueWithDeposits,
  generateAmortizationSchedule,
  generatePortfolioProjection,
  generateProjectionData,
  getGoalAdjustedMonthlyCapacity,
  calculateMonthlyCashflow,
} from "@/lib/interest";

describe("loan calculations", () => {
  it("returns simple division when interest is zero", () => {
    const payment = calculateMonthlyPayment(1200, 0, 12);
    expect(payment).toBe(100);
  });

  it("returns amortized payment for non-zero interest", () => {
    const payment = calculateMonthlyPayment(10000, 12, 12);
    expect(payment).toBeGreaterThan(880);
    expect(payment).toBeLessThan(890);
  });

  it("amortization schedule reaches near zero balance", () => {
    const schedule = generateAmortizationSchedule(10000, 10, 24);
    expect(schedule.length).toBe(24);
    expect(schedule[schedule.length - 1].remainingBalance).toBeLessThan(1);
  });
});

describe("dashboard aggregates", () => {
  it("calculates net balance", () => {
    expect(calculateNetBalance(20000, 3000, 5000)).toBe(12000);
  });

  it("calculates monthly cashflow", () => {
    expect(calculateMonthlyCashflow(5000, 3800)).toBe(1200);
  });

  it("calculates goal adjusted monthly capacity", () => {
    const result = getGoalAdjustedMonthlyCapacity({
      monthlyIncome: 5000,
      monthlyExpenses: 3200,
      totalMonthlyLoanPayment: 400,
    });
    expect(result).toBe(1400);
  });
});

describe("savings projections", () => {
  it("projects monthly compounding wallet growth correctly", () => {
    const future = futureValueWithDeposits(100000, 0, 9, 1, "monthly");
    expect(future).toBeCloseTo(109380.69, 2);
  });

  it("projects annual compounding wallet growth correctly", () => {
    const projection = generateProjectionData(5000, 0, 3, 12, "annually");
    expect(projection[projection.length - 1]?.balance ?? 0).toBeCloseTo(5150, 2);
  });

  it("aggregates mixed-frequency portfolio growth correctly", () => {
    const projection = generatePortfolioProjection(
      [
        {
          balance: 100000,
          interestRate: 9,
          compoundingFrequency: "monthly",
        },
        {
          balance: 5000,
          interestRate: 3,
          compoundingFrequency: "annually",
        },
      ],
      12
    );

    const startingBalance = projection[0]?.balance ?? 0;
    const endingBalance = projection[projection.length - 1]?.balance ?? 0;
    expect(endingBalance - startingBalance).toBeCloseTo(9530.69, 2);
  });

  it("keeps monthly projection behavior when compounding frequency is omitted", () => {
    const withDefault = generateProjectionData(25000, 0, 5, 12);
    const withMonthly = generateProjectionData(25000, 0, 5, 12, "monthly");
    expect(withDefault).toEqual(withMonthly);
  });
});
