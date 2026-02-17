import { supabase } from "@/lib/supabase";
import type { Subscription } from "@/lib/types";
import { requireData } from "@/lib/repositories/helpers";

type SubscriptionRow = {
  id: string;
  user_id: string;
  plan: "monthly" | "yearly" | "lifetime";
  status: "active" | "inactive" | "canceled" | "expired";
  source: string;
  provider: string | null;
  product_id: string | null;
  transaction_id: string | null;
  last_verified_at: string | null;
  started_at: string;
  expires_at: string | null;
  lifetime: boolean;
  created_at: string;
  updated_at: string;
};

function mapSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
    source: row.source,
    provider: row.provider,
    productId: row.product_id,
    transactionId: row.transaction_id,
    lastVerifiedAt: row.last_verified_at,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    lifetime: row.lifetime,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const subscriptionRepository = {
  async list(input?: {
    limit?: number;
    offset?: number;
  }): Promise<Subscription[]> {
    let query = supabase
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    const limit = input?.limit ?? 100;
    const offset = input?.offset ?? 0;
    query = query.range(offset, offset + Math.max(1, limit) - 1);

    const { data, error } = await query;
    const rows = requireData(data as SubscriptionRow[] | null, error);
    return rows.map(mapSubscription);
  },
};
