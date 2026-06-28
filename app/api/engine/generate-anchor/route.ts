import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateAnchor } from "@/lib/engine/anchor";
import { uploadFile, generateR2Key } from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { characterId } = await request.json();
    if (!characterId) {
      return NextResponse.json({ error: "缺少 characterId" }, { status: 400 });
    }

    // 查询角色
    const { data: character, error: charErr } = await supabase
      .from("characters")
      .select("id, reference_image_url, anchor_status")
      .eq("id", characterId)
      .single();

    if (charErr || !character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (!character.reference_image_url) {
      return NextResponse.json({ error: "角色没有参考图" }, { status: 400 });
    }

    // 校验 Credits（50 Credits）
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!sub || sub.credits_remaining < 50) {
      return NextResponse.json({ error: "Credits 不足" }, { status: 402 });
    }

    // 标记为生成中
    await supabase
      .from("characters")
      .update({ anchor_status: "generating", updated_at: new Date().toISOString() })
      .eq("id", characterId);

    try {
      // 调用引擎生成锚点
      const result = await generateAnchor(characterId, [
        character.reference_image_url,
      ]);

      // 下载视频并上传到 R2
      const resp = await fetch(result.anchorUrl);
      if (!resp.ok) {
        throw new Error(`下载锚点视频失败: ${resp.status}`);
      }
      const buf = Buffer.from(await resp.arrayBuffer());
      const r2Key = generateR2Key("anchors", `${characterId}_${Date.now()}.mp4`);
      const anchorUrl = await uploadFile(r2Key, buf, "video/mp4");

      // 扣除 Credits
      const newBalance = sub.credits_remaining - 50;
      await supabase
        .from("subscriptions")
        .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("status", "active");

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        type: "consume",
        amount: -50,
        balance_after: newBalance,
        description: `生成锚点图: ${characterId}`,
        reference_id: characterId,
      });

      // 更新角色表
      await supabase
        .from("characters")
        .update({
          anchor_image_url: anchorUrl,
          anchor_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", characterId);

      return NextResponse.json({
        anchorUrl,
        r2Key: result.r2Key,
      });
    } catch (genErr) {
      // 生成失败，更新状态
      await supabase
        .from("characters")
        .update({
          anchor_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", characterId);

      return NextResponse.json(
        { error: genErr instanceof Error ? genErr.message : "锚点图生成失败" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/engine/generate-anchor]", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
