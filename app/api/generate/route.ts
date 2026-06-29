import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/adapters";
import type { GenerateParams } from "@/lib/adapters";
import { mergeAnchors } from "@/lib/engine/multi-character";
import { moderateText } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

// POST /api/generate — 提交生成任务
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`generate:${clientIp}`, 10, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authorization required" }, { status: 401 });

    const body = await request.json();
    const { shot_id, model, mode, prompt, reference_image_url, aspect_ratio, duration, seed, reference_character_ids, batch_id } = body;

    if (!shot_id || !prompt || !mode) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // 内容安全审核
    let textToModerate = prompt;
    const { data: shotForMod } = await supabase
      .from("shots")
      .select("id, projects(title)")
      .eq("id", shot_id)
      .single();
    const projectTitle = Array.isArray(shotForMod?.projects) ? (shotForMod.projects[0] as { title?: string } | undefined)?.title : (shotForMod?.projects as { title?: string } | undefined)?.title;
    if (projectTitle) textToModerate += " " + projectTitle;
    const modResult = await moderateText(textToModerate);
    if (!modResult.pass) {
      return NextResponse.json({ error: "Content does not meet safety standards" }, { status: 422 });
    }

    const creditsToConsume = 10000;

    // L-06: 如果是批量操作，跳过扣费（已在 batch 预扣）
    if (!batch_id) {
      // L-01: 原子扣款
      const { data: newBalance, error: deductErr } = await supabase.rpc("deduct_credits", {
        p_user_id: user.id,
        p_amount: creditsToConsume,
      });

      if (deductErr) {
        if (deductErr.message?.includes("Insufficient")) {
          return NextResponse.json({ error: "Insufficient balance" }, { status: 402 });
        }
        logger.error("generate/deduct_credits", deductErr);
        return NextResponse.json({ error: "Credits deduction failed" }, { status: 500 });
      }

      // 写入 credit_transactions
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        type: "consume",
        amount: -creditsToConsume,
        balance_after: newBalance,
        description: `Generate shot: ${mode}`,
        reference_id: shot_id,
      });
    }

    // 确定 referenceImageUrl
    let finalRefImageUrl = reference_image_url;
    let finalPrompt = prompt;

    if (Array.isArray(reference_character_ids) && reference_character_ids.length > 1) {
      const merged = await mergeAnchors(reference_character_ids);
      finalRefImageUrl = merged.mergedImageUrl;
      const positionDesc = reference_character_ids
        .map((_: string, i: number) => `Character ${i + 1} ${positionLabel(i, reference_character_ids.length)}`)
        .join(", ");
      finalPrompt = `${prompt} [${positionDesc}]`;
    } else if (mode === "r2v" && !finalRefImageUrl) {
      const { data: shotRow } = await supabase
        .from("shots").select("reference_character_id").eq("id", shot_id).single();
      if (shotRow?.reference_character_id) {
        const { data: charRow } = await supabase
          .from("characters").select("anchor_image_url").eq("id", shotRow.reference_character_id).single();
        if (charRow?.anchor_image_url) finalRefImageUrl = charRow.anchor_image_url;
      }
    }

    const adapter = getAdapter(model ?? "happyhorse-1.1");
    const params: GenerateParams = {
      prompt: finalPrompt,
      mode,
      referenceImageUrl: finalRefImageUrl,
      aspectRatio: aspect_ratio ?? "9:16",
      duration: duration ?? 5,
      seed,
    };

    const result = await adapter.submit(params);

    // 更新 shot 状态
    const shotUpdate: Record<string, unknown> = {
      status: "submitted",
      task_id: result.taskId,
      model: model ?? "happyhorse-1.1-t2v",
      credits_consumed: creditsToConsume,
      is_ai_generated: true, // A-07
      updated_at: new Date().toISOString(),
    };
    if (Array.isArray(reference_character_ids) && reference_character_ids.length > 0) {
      shotUpdate.reference_character_ids = reference_character_ids;
    }
    await supabase.from("shots").update(shotUpdate).eq("id", shot_id);

    await supabase.from("generation_logs").insert({
      shot_id,
      model: model ?? "happyhorse-1.1-t2v",
      mode,
      task_id: result.taskId,
      status: "submitted",
      credits_consumed: creditsToConsume,
    });

    // L-07: 不再后台轮询，由前端驱动
    return NextResponse.json({
      task_id: result.taskId,
      shot_id,
      status: "submitted",
      credits_consumed: creditsToConsume,
    });
  } catch (error) {
    logger.error("generate", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function positionLabel(index: number, total: number): string {
  if (total === 2) return index === 0 ? "on the left" : "on the right";
  if (total === 3) {
    if (index === 0) return "on the left";
    if (index === 1) return "in the center";
    return "on the right";
  }
  const positions = ["on the far left", "on the left", "in the center", "on the right", "on the far right"];
  return positions[index] ?? `at position ${index + 1}`;
}

// GET /api/generate — 轮询任务状态（L-07: 前端驱动轮询由此处理）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const shotId = searchParams.get("shotId");

    if (!taskId && !shotId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authorization required" }, { status: 401 });

    let shot;
    if (shotId) {
      const { data } = await supabase.from("shots").select("*").eq("id", shotId).single();
      shot = data;
    } else {
      const { data } = await supabase.from("shots").select("*").eq("task_id", taskId).single();
      shot = data;
    }

    if (!shot) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // L-07: 如果状态为 submitted，尝试调用 adapter.poll() 更新
    if (shot.status === "submitted" && shot.task_id) {
      try {
        const adapter = getAdapter(shot.model ?? "happyhorse-1.1");
        const result = await adapter.poll(shot.task_id);

        if (result.status === "completed") {
          const { data: updated } = await supabase
            .from("shots")
            .update({
              status: "completed",
              video_url: result.videoUrl,
              thumbnail_url: result.thumbnailUrl,
              elapsed_seconds: result.elapsedSeconds,
              is_ai_generated: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", shot.id)
            .select()
            .single();
          if (updated) shot = updated;
        } else if (result.status === "failed") {
          // L-02: 失败时原子退款
          await supabase.rpc("refund_credits", {
            p_user_id: user.id,
            p_amount: shot.credits_consumed ?? 10000,
          });

          const { data: updated } = await supabase
            .from("shots")
            .update({
              status: "failed",
              error_message: result.errorMessage ?? "Generation failed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", shot.id)
            .select()
            .single();
          if (updated) shot = updated;
        }
      } catch (pollErr) {
        logger.warn("generate/poll", `Poll failed for task ${shot.task_id}: ${pollErr instanceof Error ? pollErr.message : "unknown"}`);
      }
    }

    return NextResponse.json(shot);
  } catch (error) {
    logger.error("generate/get", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
