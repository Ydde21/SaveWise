import { supabase } from "@/lib/supabase";
import { normalizeMonthKeys } from "@/lib/expense-recurrence";
import type { Expense } from "@/lib/types";
import {
  asNumber,
  getPaginationRange,
  requireData,
} from "@/lib/repositories/helpers";

type ExpenseRow = {
  id: string;
  user_id: string;
  category: string;
  amount: number | string;
  note: string;
  date: string;
  created_at: string;
  recurrence?: string | null;
  recurrence_end_date?: string | null;
  paid_months?: unknown;
};

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    amount: asNumber(row.amount),
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
    recurrence: row.recurrence === "monthly" ? "monthly" : "none",
    recurrenceEndDate: row.recurrence_end_date ?? null,
    paidMonths: normalizeMonthKeys(row.paid_months),
  };
}

export const expenseRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<Expense[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as ExpenseRow[] | null, error);
    return rows.map(mapExpense);
  },

  async create(input: {
    userId: string;
    category: string;
    amount: number;
    note: string;
    date: string;
    recurrence?: "none" | "monthly";
    recurrenceEndDate?: string | null;
    paidMonths?: string[];
  }): Promise<Expense> {
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        user_id: input.userId,
        category: input.category,
        amount: input.amount,
        note: input.note,
        date: input.date,
        recurrence: input.recurrence === "monthly" ? "monthly" : "none",
        recurrence_end_date: input.recurrenceEndDate ?? null,
        paid_months: normalizeMonthKeys(input.paidMonths),
      })
      .select("*")
      .single();
    const row = requireData(data as ExpenseRow | null, error);
    return mapExpense(row);
  },

  async update(
    id: string,
    patch: Partial<{
      category: string;
      amount: number;
      note: string;
      date: string;
      recurrence: "none" | "monthly";
      recurrenceEndDate: string | null;
      paidMonths: string[];
    }>
  ): Promise<Expense> {
    const { data, error } = await supabase
      .from("expenses")
      .update({
        category: patch.category,
        amount: patch.amount,
        note: patch.note,
        date: patch.date,
        recurrence: patch.recurrence,
        recurrence_end_date: patch.recurrenceEndDate,
        paid_months: patch.paidMonths ? normalizeMonthKeys(patch.paidMonths) : undefined,
      })
      .eq("id", id)
      .select("*")
      .single();
    const row = requireData(data as ExpenseRow | null, error);
    return mapExpense(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  },
};
