import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type BillingPlan = "monthly" | "yearly" | "lifetime";
type BillingStatus = "active" | "inactive" | "canceled" | "expired";

function toIsoDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) return null;
    return new Date(timestamp).toISOString();
  }
  return null;
}

export function inferPlanFromProductId(productId: string | null): BillingPlan {
  if (!productId) return "monthly";
  const normalized = productId.toLowerCase();
  if (normalized.includes("life")) return "lifetime";
  if (normalized.includes("year") || normalized.includes("annual")) {
    return "yearly";
  }
  return "monthly";
}

export function inferLifetimeFromProductId(productId: string | null): boolean {
  if (!productId) return false;
  const normalized = productId.toLowerCase();
  return normalized.includes("life");
}

export function statusFromRevenueCatEvent(
  eventType: string | null | undefined,
  expiresAt: string | null
): BillingStatus {
  const normalized = (eventType ?? "").toUpperCase();
  if (["CANCELLATION", "EXPIRATION", "BILLING_ISSUE", "SUBSCRIPTION_PAUSED"].includes(normalized)) {
    return "expired";
  }
  if (
    [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "NON_RENEWING_PURCHASE",
      "PRODUCT_CHANGE",
      "UNCANCELLATION",
    ].includes(normalized)
  ) {
    return "active";
  }
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    return "expired";
  }
  return "active";
}

export async function upsertBillingSubscription(input: {
  serviceClient: SupabaseClient;
  userId: string;
  productId: string | null;
  transactionId: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  status: BillingStatus;
  source?: string;
  provider?: string;
  lifetime?: boolean;
}) {
  const { error } = await input.serviceClient.rpc("upsert_subscription_from_billing", {
    p_user_id: input.userId,
    p_plan: inferPlanFromProductId(input.productId),
    p_status: input.status,
    p_source: input.source ?? "revenuecat",
    p_provider: input.provider ?? "revenuecat",
    p_product_id: input.productId,
    p_transaction_id: input.transactionId,
    p_started_at: input.startedAt ?? new Date().toISOString(),
    p_expires_at: input.expiresAt,
    p_lifetime:
      input.lifetime !== undefined
        ? input.lifetime
        : inferLifetimeFromProductId(input.productId),
    p_last_verified_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchRevenueCatSubscriber(input: {
  appUserId: string;
  secretApiKey: string;
}) {
  const response = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(input.appUserId)}`,
    {
      headers: {
        Authorization: `Bearer ${input.secretApiKey}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RevenueCat lookup failed (${response.status}): ${text}`);
  }

  return await response.json();
}

export function getEntitlementSnapshot(input: {
  subscriberPayload: Record<string, unknown>;
  entitlementId: string;
}) {
  const subscriber =
    (input.subscriberPayload.subscriber as Record<string, unknown> | undefined) ??
    {};
  const entitlements =
    (subscriber.entitlements as Record<string, Record<string, unknown> | undefined> | undefined) ??
    {};
  const entitlement = entitlements[input.entitlementId] ?? null;
  const productId =
    (entitlement?.product_identifier as string | undefined) ?? null;
  const subscriptions =
    (subscriber.subscriptions as Record<string, Record<string, unknown>> | undefined) ??
    {};
  const subscription = productId ? subscriptions[productId] : null;
  const transactionId =
    (subscription?.store_transaction_id as string | undefined) ??
    (subscription?.original_transaction_id as string | undefined) ??
    (entitlement?.transaction_id as string | undefined) ??
    null;
  const startedAt =
    toIsoDate(entitlement?.purchase_date) ??
    toIsoDate(subscription?.purchase_date) ??
    new Date().toISOString();
  const expiresAt =
    toIsoDate(entitlement?.expires_date) ??
    toIsoDate(subscription?.expires_date) ??
    null;
  const isActive = Boolean(entitlement);

  return {
    productId,
    transactionId,
    startedAt,
    expiresAt,
    isActive,
  };
}

