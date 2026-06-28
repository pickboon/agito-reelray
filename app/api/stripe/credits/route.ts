import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("credits_remaining, plan, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (subErr && subErr.code !== "PGRST116") {
      return NextResponse.json({ error: "查询失败" }, { status: 500 });
    }

    // Also get transaction history
    const { data: transactions } = await supabase
      .from("credit_transactions")
      .select("amount, type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return NextResponse.json({
      credits_remaining: sub?.credits_remaining ?? 0,
      plan: sub?.plan ?? "free",
      status: sub?.status ?? "inactive",
      transactions: transactions ?? [],
    });
  } catch (e) {
    console.error("[GET /api/stripe/credits]", e);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}
