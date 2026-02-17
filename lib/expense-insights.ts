import { getUtcMonthKey } from "@/lib/expense-recurrence";
import type { Expense, ExpenseCategory, Income, MonthKey } from "@/lib/types";

export interface RecurringStatusItem {
  amount: number;
  isActive: boolean;
  isPaid: boolean;
}

export interface RecurringMonthlySummary {
  activeRecurringCount: number;
  paidRecurringCount: number;
  unpaidRecurringCount: number;
  unpaidRecurringAmount: number;
}

export interface MonthlyExpenseIncomeSnapshot {
  monthlyExpenses: Expense[];
  monthlyIncomes: Income[];
  monthlyExpenseTotal: number;
  monthlyIncomeTotal: number;
  monthlyNetCashflow: number;
  monthlyExpenseCount: number;
  monthlyIncomeCount: number;
}

export interface BreakdownRow {
  key: string;
  label: string;
  amount: number;
  share: number;
}

export function filterItemsByMonthKey<T extends { date: string }>(
  items: T[],
  monthKey: MonthKey
): T[] {
  return items.filter((item) => getUtcMonthKey(item.date) === monthKey);
}

export function buildMonthlyExpenseIncomeSnapshot(params: {
  expenses: Expense[];
  incomes: Income[];
  monthKey: MonthKey;
}): MonthlyExpenseIncomeSnapshot {
  const monthlyExpenses = filterItemsByMonthKey(params.expenses, params.monthKey);
  const monthlyIncomes = filterItemsByMonthKey(params.incomes, params.monthKey);
  const monthlyExpenseTotal = monthlyExpenses.reduce(
    (sum, item) => sum + item.amount,
    0
  );
  const monthlyIncomeTotal = monthlyIncomes.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return {
    monthlyExpenses,
    monthlyIncomes,
    monthlyExpenseTotal,
    monthlyIncomeTotal,
    monthlyNetCashflow: monthlyIncomeTotal - monthlyExpenseTotal,
    monthlyExpenseCount: monthlyExpenses.length,
    monthlyIncomeCount: monthlyIncomes.length,
  };
}

export function summarizeRecurringStatus(
  items: RecurringStatusItem[]
): RecurringMonthlySummary {
  const activeItems = items.filter((item) => item.isActive);
  const paidRecurringCount = activeItems.filter((item) => item.isPaid).length;
  const unpaidItems = activeItems.filter((item) => !item.isPaid);

  return {
    activeRecurringCount: activeItems.length,
    paidRecurringCount,
    unpaidRecurringCount: unpaidItems.length,
    unpaidRecurringAmount: unpaidItems.reduce((sum, item) => sum + item.amount, 0),
  };
}

export function buildExpenseCategoryBreakdown(params: {
  expenses: Expense[];
  categories: ExpenseCategory[];
  limit?: number;
}): BreakdownRow[] {
  const { expenses, categories, limit = 5 } = params;
  const amountByCategory = new Map<string, number>();
  const labelByCategory = new Map<string, string>();

  for (let i = 0; i < categories.length; i += 1) {
    labelByCategory.set(categories[i].key, categories[i].label);
  }

  for (let i = 0; i < expenses.length; i += 1) {
    const item = expenses[i];
    amountByCategory.set(
      item.category,
      (amountByCategory.get(item.category) ?? 0) + item.amount
    );
    if (!labelByCategory.has(item.category)) {
      labelByCategory.set(item.category, item.category);
    }
  }

  const total = Array.from(amountByCategory.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return Array.from(amountByCategory.entries())
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({
      key,
      label: labelByCategory.get(key) ?? key,
      amount,
      share: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function buildIncomeSourceBreakdown(params: {
  incomes: Income[];
  limit?: number;
}): BreakdownRow[] {
  const { incomes, limit = 5 } = params;
  const amountBySource = new Map<string, number>();
  const displayBySource = new Map<string, string>();

  for (let i = 0; i < incomes.length; i += 1) {
    const item = incomes[i];
    const trimmed = item.source.trim();
    const normalizedKey = trimmed ? trimmed.toLowerCase() : "other";
    const display = trimmed || "Other";

    if (!displayBySource.has(normalizedKey)) {
      displayBySource.set(normalizedKey, display);
    }

    amountBySource.set(
      normalizedKey,
      (amountBySource.get(normalizedKey) ?? 0) + item.amount
    );
  }

  const total = Array.from(amountBySource.values()).reduce(
    (sum, amount) => sum + amount,
    0
  );

  return Array.from(amountBySource.entries())
    .filter(([, amount]) => amount > 0)
    .map(([key, amount]) => ({
      key,
      label: displayBySource.get(key) ?? "Other",
      amount,
      share: total > 0 ? amount / total : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}
