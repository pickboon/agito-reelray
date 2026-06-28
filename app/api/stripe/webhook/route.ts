import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) throw new Error("Missing env: STRIPE_SECRET_KEY");

const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-06-24.dahlia" as any,
});

const CREDITS_MAP: Record<string, number> = {
  starter: 20_000,
  pro: 80_000,
  studio: 300_000,
  small: 45_000,
  medium: 200_000,
  large: 600_000,
};

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const credits = CREDITS_MAP[session.metadata?.bundle || ""] || 0;

        if (userId && credits > 0) {
          // Add credits for bundle purchase
          await addCredits(userId, credits, "purchase", session.id);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        const plan = subscription.metadata?.plan;

        if (userId && plan && subscription.status === "active") {
          const credits = CREDITS_MAP[plan] || 0;
          await upsertSubscription(userId, plan, credits, subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          await cancelSubscription(userId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // invoice.subscription is typed as string | null in older Stripe types
        const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string | undefined;
        if (subscriptionId) {
          await renewSubscriptionCredits(subscriptionId);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function addCredits(
  userId: string,
  credits: number,
  type: string,
  stripeRef: string
) {
  const { createClient } = await import("@supabase/supabase-js");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!sbKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(sbUrl, sbKey);

  // 查询当前余额作为 creditsBefore
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("credits_remaining")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  const creditsBefore = sub?.credits_remaining ?? 0;
  const balanceAfter = creditsBefore + credits;

  // 更新 subscription 余额
  await supabase
    .from("subscriptions")
    .update({ credits_remaining: balanceAfter, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type,
    balance_after: balanceAfter,
    reference_id: stripeRef,
  });
}

async function upsertSubscription(
  userId: string,
  plan: string,
  monthlyCredits: number,
  stripeSubId: string
) {
  const { createClient } = await import("@supabase/supabase-js");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!sbKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(sbUrl, sbKey);

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (existing) {
    await supabase
      .from("subscriptions")
      .update({
        plan,
        credits_remaining: monthlyCredits,
        stripe_subscription_id: stripeSubId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan,
      credits_remaining: monthlyCredits,
      stripe_subscription_id: stripeSubId,
      status: "active",
    });
  }
}

async function cancelSubscription(userId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!sbKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(sbUrl, sbKey);

  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");
}

async function renewSubscriptionCredits(stripeSubId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!sbKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(sbUrl, sbKey);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan")
    .eq("stripe_subscription_id", stripeSubId)
    .single();

  if (!sub) return;

  const credits = CREDITS_MAP[sub.plan] || 0;
  if (credits > 0) {
    await supabase
      .from("subscriptions")
      .update({
        credits_remaining: credits,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
  }
}
