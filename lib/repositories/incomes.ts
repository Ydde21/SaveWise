import { supabase } from "@/lib/supabase";
import type { Income } from "@/lib/types";
import {
  asNumber,
  getPaginationRange,
  requireData,
} from "@/lib/repositories/helpers";

type IncomeRow = {
  id: string;
  user_id: string;
  source: string;
  amount: number | string;
  note: string;
  date: string;
  created_at: string;
};

function mapIncome(row: IncomeRow): Income {
  return {
    id: row.id,
    userId: row.user_id,
    source: row.source,
    amount: asNumber(row.amount),
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
  };
}

export const incomeRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<Income[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("incomes")
      .select("*")
      .order("date", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as IncomeRow[] | null, error);
    return rows.map(mapIncome);
  },

  async create(input: {
    userId: string;
    source: string;
    amount: number;
    note: string;
    date: string;
  }): Promise<Income> {
    const { data, error } = await supabase
      .from("incomes")
      .insert({
        user_id: input.userId,
        source: input.source,
        amount: input.amount,
        note: input.note,
        date: input.date,
      })
      .select("*")
      .single();
    const row = requireData(data as IncomeRow | null, error);
    return mapIncome(row);
  },

  async update(
    id: string,
    patch: Partial<{ source: string; amount: number; note: string; date: string }>
  ): Promise<Income> {
    const { data, error } = await supabase
      .from("incomes")
      .update({
        source: patch.source,
        amount: patch.amount,
        note: patch.note,
        date: patch.date,
      })
      .eq("id", id)
      .select("*")
      .single();
    const row = requireData(data as IncomeRow | null, error);
    return mapIncome(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("incomes").delete().eq("id", id);
    if (error) throw error;
  },
};
