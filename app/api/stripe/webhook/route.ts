import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

// 不可恢复错误：用户删除、记录不存在等 → 不触发 Stripe 重试
// 数据库超时、连接失败等 → 返回 500 让 Stripe 重试
function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return true;
  const msg = err.message.toLowerCase();
  if (
    msg.includes("timeout") ||
    msg.includes("connection") ||
    msg.includes("econnrefused") ||
    msg.includes("deadlock") ||
    msg.includes("could not serialize") ||
    msg.includes("network")
  ) {
    return true;
  }
  return false;
}

function getAdminClient(): SupabaseClient {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL");
  if (!sbKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
  return createClient(sbUrl, sbKey);
}

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error("Missing env: STRIPE_SECRET_KEY");
  const stripe = new Stripe(stripeKey, { apiVersion: "2026-06-24.dahlia" as any });

  // P3-5: 可选 IP 白名单检查
  const allowedIps = process.env.STRIPE_WEBHOOK_IPS;
  if (allowedIps) {
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
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

  const supabase = getAdminClient();

  // ── 幂等去重：event.id 已处理过则直接返回 ──
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();

  if (existingEvent) {
    console.log(`[webhook] event ${event.id} (${event.type}) 已处理，跳过`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;

        if (userId) {
          const bundleKey = session.metadata?.bundle;
          if (bundleKey) {
            const credits = CREDITS_MAP[bundleKey] || 0;
            if (credits > 0) {
              await addCredits(supabase, userId, credits, "purchase", session.id);
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
          await upsertSubscription(supabase, userId, plan, credits, subscription.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.user_id;
        if (userId) {
          await cancelSubscription(supabase, userId);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (
          invoice as unknown as Record<string, unknown>
        ).subscription as string | undefined;
        if (subscriptionId) {
          await renewSubscriptionCredits(supabase, subscriptionId);
        }
        break;
      }
    }

    // 处理成功 → 记录幂等（ON CONFLICT 忽略，防止并发写入）
    const { error: insertErr } = await supabase
      .from("webhook_events")
      .upsert(
        { event_id: event.id, event_type: event.type },
        { onConflict: "event_id", ignoreDuplicates: true }
      );
    if (insertErr) {
      console.warn(`[webhook] 幂等记录写入失败（可忽略）: ${insertErr.message}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook Error]", error);
    if (!isRetryableError(error)) {
      // 不可恢复错误：记录日志并返回 200，避免 Stripe 无意义重试
      console.warn(`[webhook] 不可恢复错误，跳过重试: ${(error as Error).message}`);
      return NextResponse.json({ received: true });
    }
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// ── addCredits：乐观锁防竞态，失败重试一次 ──
async function addCredits(
  supabase: SupabaseClient,
  userId: string,
  credits: number,
  type: string,
  stripeRef: string
) {
  const { data: sub, error: selErr } = await supabase
    .from("subscriptions")
    .select("credits_remaining")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (selErr || !sub) {
    console.warn(`[webhook] addCredits: user ${userId} 无 active subscription，跳过`);
    return;
  }

  const creditsBefore = sub.credits_remaining ?? 0;
  const balanceAfter = creditsBefore + credits;

  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      credits_remaining: balanceAfter,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("credits_remaining", creditsBefore)
    .select("credits_remaining")
    .maybeSingle();

  let finalBalance = balanceAfter;

  if (error || !updated) {
    // 乐观锁失败 → 重新读取并重试一次
    console.warn(`[webhook] addCredits 乐观锁冲突，重试: ${error?.message}`);
    const { data: sub2 } = await supabase
      .from("subscriptions")
      .select("credits_remaining")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (sub2) {
      const balanceAfter2 = (sub2.credits_remaining ?? 0) + credits;
      const { data: updated2 } = await supabase
        .from("subscriptions")
        .update({
          credits_remaining: balanceAfter2,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("status", "active")
        .eq("credits_remaining", sub2.credits_remaining)
        .select("credits_remaining")
        .maybeSingle();

      if (updated2) {
        finalBalance = balanceAfter2;
      } else {
        console.error(`[webhook] addCredits 重试也失败，user=${userId}`);
      }
    }
  }

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    amount: credits,
    type,
    balance_after: finalBalance,
    reference_id: stripeRef,
  });
}

// ── upsertSubscription：新建无需锁，更新加乐观锁 ──
async function upsertSubscription(
  supabase: SupabaseClient,
  userId: string,
  plan: string,
  monthlyCredits: number,
  stripeSubId: string
) {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, credits_remaining")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    const newBalance = (existing.credits_remaining ?? 0) + monthlyCredits;
    const { data: updated, error } = await supabase
      .from("subscriptions")
      .update({
        plan,
        credits_remaining: newBalance,
        stripe_subscription_id: stripeSubId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("credits_remaining", existing.credits_remaining)
      .select("id")
      .maybeSingle();

    if (error || !updated) {
      console.warn(`[webhook] upsertSubscription 乐观锁冲突，重试: ${error?.message}`);
      const { data: existing2 } = await supabase
        .from("subscriptions")
        .select("id, credits_remaining")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (existing2) {
        const newBalance2 = (existing2.credits_remaining ?? 0) + monthlyCredits;
        await supabase
          .from("subscriptions")
          .update({
            plan,
            credits_remaining: newBalance2,
            stripe_subscription_id: stripeSubId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing2.id)
          .eq("credits_remaining", existing2.credits_remaining);
      }
    }
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

async function cancelSubscription(supabase: SupabaseClient, userId: string) {
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");
}

// ── renewSubscriptionCredits：乐观锁防重复发放 ──
async function renewSubscriptionCredits(
  supabase: SupabaseClient,
  stripeSubId: string
) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan, credits_remaining")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();

  if (!sub) {
    console.warn(
      `[webhook] renewSubscriptionCredits: subscription ${stripeSubId} 不存在，跳过`
    );
    return;
  }

  const credits = CREDITS_MAP[sub.plan] || 0;
  if (credits <= 0) return;

  const newBalance = (sub.credits_remaining ?? 0) + credits;
  const { data: updated, error } = await supabase
    .from("subscriptions")
    .update({
      credits_remaining: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id)
    .eq("credits_remaining", sub.credits_remaining)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    console.warn(`[webhook] renewSubscriptionCredits 乐观锁冲突，重试: ${error?.message}`);
    const { data: sub2 } = await supabase
      .from("subscriptions")
      .select("id, credits_remaining")
      .eq("id", sub.id)
      .maybeSingle();

    if (sub2) {
      const newBalance2 = (sub2.credits_remaining ?? 0) + credits;
      await supabase
        .from("subscriptions")
        .update({
          credits_remaining: newBalance2,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub2.id)
        .eq("credits_remaining", sub2.credits_remaining);
    }
  }
}
