import { supabase } from "@/lib/supabase";
import type { CompoundingFrequency, Wallet } from "@/lib/types";
import {
  asNumber,
  getPaginationRange,
  requireData,
} from "@/lib/repositories/helpers";

type WalletRow = {
  id: string;
  user_id: string;
  name: string;
  balance: number | string;
  interest_rate: number | string;
  compounding_frequency: string;
  currency: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

function mapWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    balance: asNumber(row.balance),
    interestRate: asNumber(row.interest_rate),
    compoundingFrequency:
      (row.compounding_frequency as CompoundingFrequency) ?? "monthly",
    currency: row.currency,
    color: row.color,
    icon: row.icon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const walletRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<Wallet[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as WalletRow[] | null, error);
    return rows.map(mapWallet);
  },

  async getById(id: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapWallet(data as WalletRow);
  },

  async create(input: {
    userId: string;
    name: string;
    balance: number;
    interestRate: number;
    compoundingFrequency: CompoundingFrequency;
    currency: string;
    color: string;
    icon: string;
  }): Promise<Wallet> {
    const { data, error } = await supabase
      .from("wallets")
      .insert({
        user_id: input.userId,
        name: input.name,
        balance: input.balance,
        interest_rate: input.interestRate,
        compounding_frequency: input.compoundingFrequency,
        currency: input.currency,
        color: input.color,
        icon: input.icon,
      })
      .select("*")
      .single();
    const row = requireData(data as WalletRow | null, error);
    return mapWallet(row);
  },

  async update(
    id: string,
    patch: Partial<{
      name: string;
      balance: number;
      interestRate: number;
      compoundingFrequency: CompoundingFrequency;
      currency: string;
      color: string;
      icon: string;
    }>
  ): Promise<Wallet> {
    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.balance !== undefined) updateData.balance = patch.balance;
    if (patch.interestRate !== undefined) {
      updateData.interest_rate = patch.interestRate;
    }
    if (patch.compoundingFrequency !== undefined) {
      updateData.compounding_frequency = patch.compoundingFrequency;
    }
    if (patch.currency !== undefined) updateData.currency = patch.currency;
    if (patch.color !== undefined) updateData.color = patch.color;
    if (patch.icon !== undefined) updateData.icon = patch.icon;

    const { data, error } = await supabase
      .from("wallets")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();
    const row = requireData(data as WalletRow | null, error);
    return mapWallet(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("wallets").delete().eq("id", id);
    if (error) throw error;
  },
};
