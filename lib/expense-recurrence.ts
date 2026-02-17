import type { Expense, ExpenseRecurrence, MonthKey } from "@/lib/types";

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toUtcDate(value: string | Date): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = DATE_ONLY_PATTERN.test(trimmed)
    ? `${trimmed}T00:00:00.000Z`
    : trimmed;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getUtcMonthKey(value: string | Date): MonthKey {
  const date = toUtcDate(value) ?? new Date();
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(2, "0")}`;
}

export function normalizeMonthKeys(input: unknown): MonthKey[] {
  if (!Array.isArray(input)) return [];
  const unique = new Set<MonthKey>();
  for (let i = 0; i < input.length; i += 1) {
    const item = input[i];
    if (typeof item !== "string") continue;
    const monthKey = item.trim();
    if (!MONTH_KEY_PATTERN.test(monthKey)) continue;
    unique.add(monthKey);
  }
  return Array.from(unique).sort();
}

export function getExpenseRecurrence(expense: Pick<Expense, "recurrence">): ExpenseRecurrence {
  return expense.recurrence === "monthly" ? "monthly" : "none";
}

export function getExpensePaidMonths(expense: Pick<Expense, "paidMonths">): MonthKey[] {
  return normalizeMonthKeys(expense.paidMonths);
}

export function isRecurringExpenseActiveForMonth(
  expense: Pick<Expense, "date" | "recurrence" | "recurrenceEndDate">,
  monthKey: MonthKey
): boolean {
  if (getExpenseRecurrence(expense) !== "monthly") return false;
  if (!MONTH_KEY_PATTERN.test(monthKey)) return false;
  const startMonthKey = getUtcMonthKey(expense.date);
  if (monthKey < startMonthKey) return false;
  if (!expense.recurrenceEndDate) return true;
  const endMonthKey = getUtcMonthKey(expense.recurrenceEndDate);
  return monthKey <= endMonthKey;
}

export function upsertPaidMonth(
  paidMonths: string[] | undefined,
  monthKey: MonthKey,
  paid: boolean
): MonthKey[] {
  const next = new Set(normalizeMonthKeys(paidMonths));
  if (paid) {
    next.add(monthKey);
  } else {
    next.delete(monthKey);
  }
  return Array.from(next).sort();
}

export function buildEffectiveExpenses(expenses: Expense[]): Expense[] {
  const ledger: Expense[] = [];

  for (let i = 0; i < expenses.length; i += 1) {
    const expense = expenses[i];
    const recurrence = getExpenseRecurrence(expense);
    if (recurrence !== "monthly") {
      ledger.push({
        ...expense,
        recurrence: "none",
        recurrenceEndDate: null,
        paidMonths: normalizeMonthKeys(expense.paidMonths),
      });
      continue;
    }

    const paidMonths = getExpensePaidMonths(expense);
    for (let m = 0; m < paidMonths.length; m += 1) {
      const monthKey = paidMonths[m];
      if (!isRecurringExpenseActiveForMonth(expense, monthKey)) continue;
      ledger.push({
        ...expense,
        id: `${expense.id}:${monthKey}`,
        date: `${monthKey}-01`,
        recurrence: "none",
        recurrenceEndDate: null,
        paidMonths: [],
        recurrenceSourceId: expense.id,
        paidMonthKey: monthKey,
        isRecurringProjection: true,
      });
    }
  }

  return ledger.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
