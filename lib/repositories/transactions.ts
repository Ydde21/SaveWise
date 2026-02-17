import { supabase } from "@/lib/supabase";
import type { Transaction } from "@/lib/types";
import {
  asNumber,
  getPaginationRange,
  requireData,
} from "@/lib/repositories/helpers";

type TransactionRow = {
  id: string;
  user_id: string;
  wallet_id: string;
  type: "deposit" | "withdrawal";
  amount: number | string;
  note: string;
  date: string;
  created_at: string;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.user_id,
    walletId: row.wallet_id,
    type: row.type,
    amount: asNumber(row.amount),
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
  };
}

export const transactionRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("savings_transactions")
      .select("*")
      .order("date", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as TransactionRow[] | null, error);
    return rows.map(mapTransaction);
  },

  async create(input: {
    userId: string;
    walletId: string;
    type: "deposit" | "withdrawal";
    amount: number;
    note: string;
    date: string;
  }): Promise<Transaction> {
    const { data, error } = await supabase.rpc(
      "create_savings_transaction_atomic",
      {
        p_wallet_id: input.walletId,
        p_type: input.type,
        p_amount: input.amount,
        p_note: input.note,
        p_date: input.date,
      }
    );
    const raw = Array.isArray(data) ? data[0] : data;
    const row = requireData(raw as TransactionRow | null, error);
    return mapTransaction(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc("delete_savings_transaction_atomic", {
      p_transaction_id: id,
    });
    if (error) throw error;
  },
};
