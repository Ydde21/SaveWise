import { supabase } from "@/lib/supabase";
import type { SavingsGoal } from "@/lib/types";
import {
  asNumber,
  getPaginationRange,
  requireData,
} from "@/lib/repositories/helpers";

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number | string;
  current_amount: number | string;
  deadline: string;
  wallet_id: string | null;
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
};

function mapGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount: asNumber(row.target_amount),
    currentAmount: asNumber(row.current_amount),
    deadline: row.deadline,
    walletId: row.wallet_id,
    icon: row.icon,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const goalRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<SavingsGoal[]> {
    const pagination = getPaginationRange(input);
    const { data, error } = await supabase
      .from("savings_goals")
      .select("*")
      .order("created_at", { ascending: false })
      .range(pagination.from, pagination.to);
    const rows = requireData(data as GoalRow[] | null, error);
    return rows.map(mapGoal);
  },

  async create(input: {
    userId: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    walletId: string | null;
    icon: string;
    color: string;
  }): Promise<SavingsGoal> {
    const { data, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: input.userId,
        name: input.name,
        target_amount: input.targetAmount,
        current_amount: input.currentAmount,
        deadline: input.deadline,
        wallet_id: input.walletId,
        icon: input.icon,
        color: input.color,
      })
      .select("*")
      .single();
    const row = requireData(data as GoalRow | null, error);
    return mapGoal(row);
  },

  async update(
    id: string,
    patch: Partial<{
      name: string;
      targetAmount: number;
      currentAmount: number;
      deadline: string;
      walletId: string | null;
      icon: string;
      color: string;
    }>
  ): Promise<SavingsGoal> {
    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.targetAmount !== undefined) {
      updateData.target_amount = patch.targetAmount;
    }
    if (patch.currentAmount !== undefined) {
      updateData.current_amount = patch.currentAmount;
    }
    if (patch.deadline !== undefined) updateData.deadline = patch.deadline;
    if (patch.walletId !== undefined) updateData.wallet_id = patch.walletId;
    if (patch.icon !== undefined) updateData.icon = patch.icon;
    if (patch.color !== undefined) updateData.color = patch.color;

    const { data, error } = await supabase
      .from("savings_goals")
      .update(updateData)
      .eq("id", id)
      .select("*")
      .single();
    const row = requireData(data as GoalRow | null, error);
    return mapGoal(row);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("savings_goals").delete().eq("id", id);
    if (error) throw error;
  },
};
