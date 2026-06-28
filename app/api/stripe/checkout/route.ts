import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { getStripe, PLANS, BUNDLES } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { type, plan, bundle } = await request.json();
    const stripe = getStripe();

    // 获取或创建 Stripe customer
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    if (type === "subscription" && plan && plan !== "free") {
      const planInfo = PLANS[plan as keyof typeof PLANS];
      if (!planInfo) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

      const priceId = plan === "starter"
        ? process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
        : plan === "pro"
        ? process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID;

      if (!priceId) return NextResponse.json({ error: "Plan not configured" }, { status: 500 });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/dashboard?upgraded=true`,
        cancel_url: `${siteUrl}/pricing`,
        metadata: { user_id: user.id, plan },
      });

      return NextResponse.json({ url: session.url });
    }

    if (type === "bundle" && bundle) {
      const bundleInfo = BUNDLES[bundle as keyof typeof BUNDLES];
      if (!bundleInfo) return NextResponse.json({ error: "Invalid bundle" }, { status: 400 });

      const priceId = bundle === "small"
        ? process.env.NEXT_PUBLIC_STRIPE_SMALL_BUNDLE_PRICE_ID
        : bundle === "medium"
        ? process.env.NEXT_PUBLIC_STRIPE_MEDIUM_BUNDLE_PRICE_ID
        : process.env.NEXT_PUBLIC_STRIPE_LARGE_BUNDLE_PRICE_ID;

      if (!priceId) return NextResponse.json({ error: "Bundle not configured" }, { status: 500 });

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/dashboard?bundle_purchased=true`,
        cancel_url: `${siteUrl}/pricing`,
        metadata: { user_id: user.id, bundle, credits: String(bundleInfo.credits) },
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Invalid checkout type" }, { status: 400 });
  } catch (error) {
    console.error("[POST /api/stripe/checkout]", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
