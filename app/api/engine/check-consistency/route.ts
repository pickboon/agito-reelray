import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkConsistency } from "@/lib/engine/consistency";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { shotId } = await request.json();
    if (!shotId) {
      return NextResponse.json({ error: "缺少 shotId" }, { status: 400 });
    }

    // 查询 shot 及其关联角色
    const { data: shot, error: shotErr } = await supabase
      .from("shots")
      .select("id, video_url, reference_character_id")
      .eq("id", shotId)
      .single();

    if (shotErr || !shot) {
      return NextResponse.json({ error: "镜头不存在" }, { status: 404 });
    }

    if (!shot.video_url) {
      return NextResponse.json({ error: "镜头没有生成视频" }, { status: 400 });
    }

    // 获取角色锚点图
    let anchorImageUrl = "";
    if (shot.reference_character_id) {
      const { data: charRow } = await supabase
        .from("characters")
        .select("anchor_image_url")
        .eq("id", shot.reference_character_id)
        .single();

      anchorImageUrl = charRow?.anchor_image_url ?? "";
    }

    // 校验 Credits（1 Credit）
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!sub || sub.credits_remaining < 1) {
      return NextResponse.json({ error: "Credits 不足" }, { status: 402 });
    }

    // 执行一致性检查
    const result = await checkConsistency(shotId, anchorImageUrl, shot.video_url);

    // 扣除 1 Credit
    const newBalance = sub.credits_remaining - 1;
    await supabase
      .from("subscriptions")
      .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "consume",
      amount: -1,
      balance_after: newBalance,
      description: `一致性检查: ${shotId}`,
      reference_id: shotId,
    });

    // 更新 shots 表
    await supabase
      .from("shots")
      .update({
        consistency_score: result.overallScore,
        consistency_checks: result as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shotId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/engine/check-consistency]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
