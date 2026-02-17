import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  inferLifetimeFromProductId,
  statusFromRevenueCatEvent,
  upsertBillingSubscription,
} from "../_shared/revenuecat.ts";

function toIsoFromMs(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed." }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment configuration.");
    }

    const expectedSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (expectedSecret) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${expectedSecret}`) {
        return new Response(JSON.stringify({ error: "Unauthorized." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await request.json();
    const event =
      (payload?.event as Record<string, unknown> | undefined) ??
      (payload as Record<string, unknown>);

    const userId =
      (event?.app_user_id as string | undefined) ??
      (event?.original_app_user_id as string | undefined) ??
      null;

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing app user id." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productId = (event?.product_id as string | undefined) ?? null;
    const transactionId =
      (event?.transaction_id as string | undefined) ??
      (event?.original_transaction_id as string | undefined) ??
      null;
    const startedAt =
      toIsoFromMs(event?.purchased_at_ms) ??
      toIsoFromMs(event?.event_timestamp_ms) ??
      new Date().toISOString();
    const expiresAt = toIsoFromMs(event?.expiration_at_ms);
    const eventType = (event?.type as string | undefined) ?? null;
    const status = statusFromRevenueCatEvent(eventType, expiresAt);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    await upsertBillingSubscription({
      serviceClient,
      userId,
      productId,
      transactionId,
      startedAt,
      expiresAt,
      status,
      lifetime: inferLifetimeFromProductId(productId),
      source: "revenuecat_webhook",
      provider: "revenuecat",
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Webhook processing failed.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

