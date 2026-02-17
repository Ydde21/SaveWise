import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  fetchRevenueCatSubscriber,
  getEntitlementSnapshot,
  upsertBillingSubscription,
} from "../_shared/revenuecat.ts";

const entitlementId =
  Deno.env.get("REVENUECAT_ENTITLEMENT_ID") ?? "premium";

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const revenueCatKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !revenueCatKey) {
      throw new Error("Missing required environment configuration.");
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const subscriberPayload = await fetchRevenueCatSubscriber({
      appUserId: user.id,
      secretApiKey: revenueCatKey,
    });
    const entitlement = getEntitlementSnapshot({
      subscriberPayload,
      entitlementId,
    });

    if (entitlement.isActive) {
      await upsertBillingSubscription({
        serviceClient,
        userId: user.id,
        productId: entitlement.productId,
        transactionId: entitlement.transactionId,
        startedAt: entitlement.startedAt,
        expiresAt: entitlement.expiresAt,
        status: "active",
      });
    } else {
      const { error: expireError } = await serviceClient
        .from("subscriptions")
        .update({
          status: "expired",
          last_verified_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "revenuecat")
        .eq("status", "active");

      if (expireError) {
        throw new Error(expireError.message);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        entitlementActive: entitlement.isActive,
        productId: entitlement.productId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync subscription.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

