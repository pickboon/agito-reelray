import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// 订阅套餐 + 充值包的 credits 映射
const CREDITS_MAP: Record<string, number> = {
  // 订阅套餐 (metadata.plan)
  starter: 20_000,
  pro: 80_000,
  studio: 300_000,
  // 充值包 (metadata.bundle)
  small: 45_000,
  medium: 200_000,
  large: 600_000,
};

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Missing env: STRIPE_SECRET_KEY");
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as any });

  // P3-5: 可选 IP 白名单检查
  const allowedIps = process.env.STRIPE_WEBHOOK_IPS;
  if (allowedIps) {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
    const ipList = allowedIps.split(",").map((ip) => ip.trim());
    if (!ipList.includes(clientIp)) {
      console.warn(`[webhook] IP ${clientIp} 不在白名单中，拒绝`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

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

        if (userId) {
          // 优先处理 bundle 充值包
          const bundleKey = session.metadata?.bundle;
          if (bundleKey) {
            const credits = CREDITS_MAP[bundleKey] || 0;
            if (credits > 0) {
              await addCredits(userId, credits, "purchase", session.id);
            }
          }
          // 订阅套餐由 subscription.created/updated 事件处理，此处不重复
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
    .select("id, credits_remaining")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (existing) {
    // 已有记录：累加 credits，不覆盖
    const newBalance = (existing.credits_remaining ?? 0) + monthlyCredits;
    await supabase
      .from("subscriptions")
      .update({
        plan,
        credits_remaining: newBalance,
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
    .select("id, user_id, plan, credits_remaining")
    .eq("stripe_subscription_id", stripeSubId)
    .single();

  if (!sub) return;

  const credits = CREDITS_MAP[sub.plan] || 0;
  if (credits > 0) {
    // 累加 credits 而非覆盖
    const newBalance = (sub.credits_remaining ?? 0) + credits;
    await supabase
      .from("subscriptions")
      .update({
        credits_remaining: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);
  }
}
