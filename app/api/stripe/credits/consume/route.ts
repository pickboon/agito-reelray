import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { shot_id, credits } = await req.json();
    if (!shot_id || !credits || credits <= 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Atomic: check balance + consume
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("subscriptions")
      .select("id, credits_remaining")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (subErr || !sub) {
      return NextResponse.json(
        { error: "No active subscription. Please purchase credits first." },
        { status: 402 }
      );
    }

    if (sub.credits_remaining < credits) {
      return NextResponse.json(
        {
          error: `Insufficient credits. Required: ${credits}, Available: ${sub.credits_remaining}`,
          required: credits,
          available: sub.credits_remaining,
        },
        { status: 402 }
      );
    }

    // Deduct credits
    const { error: updateErr } = await supabaseAdmin
      .from("subscriptions")
      .update({ credits_remaining: sub.credits_remaining - credits })
      .eq("id", sub.id)
      .eq("credits_remaining", sub.credits_remaining); // optimistic lock

    if (updateErr) {
      return NextResponse.json(
        { error: "Credits deduction failed (concurrent modification)" },
        { status: 409 }
      );
    }

    // Record transaction
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: user.id,
      shot_id,
      amount: -credits,
      type: "generation",
      created_at: new Date().toISOString(),
    });

    // Update shot
    await supabaseAdmin
      .from("shots")
      .update({ credits_consumed: credits })
      .eq("id", shot_id);

    return NextResponse.json({
      success: true,
      credits_deducted: credits,
      credits_remaining: sub.credits_remaining - credits,
    });
  } catch (e) {
    console.error("[POST /api/stripe/credits/consume]", e);
    return NextResponse.json({ error: "消费失败" }, { status: 500 });
  }
}
