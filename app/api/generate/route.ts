import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAdapter } from "@/lib/adapters";
import type { GenerateParams } from "@/lib/adapters";
import { checkConsistency } from "@/lib/engine/consistency";
import { mergeAnchors } from "@/lib/engine/multi-character";
import { moderateText } from "@/lib/moderation";

// POST /api/generate — 提交生成任务
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { shot_id, model, mode, prompt, reference_image_url, aspect_ratio, duration, seed, reference_character_ids } = body;

    if (!shot_id || !prompt || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── 内容安全审核（Prompt + 角色描述） ──
    const modResult = await moderateText(prompt);
    if (!modResult.pass) {
      return NextResponse.json(
        { error: "内容未通过安全审核", detail: modResult.reason, label: modResult.label },
        { status: 422 }
      );
    }

    // 校验 Credits
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (!sub || sub.credits_remaining < 10000) {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }

    // 确定 referenceImageUrl
    let finalRefImageUrl = reference_image_url;
    let finalPrompt = prompt;

    // 多角色模式：合并多个锚点图
    if (Array.isArray(reference_character_ids) && reference_character_ids.length > 1) {
      const merged = await mergeAnchors(reference_character_ids);
      finalRefImageUrl = merged.mergedImageUrl;

      // 自动追加位置描述
      const positionDesc = reference_character_ids
        .map((_: string, i: number) => `Character ${i + 1} ${positionLabel(i, reference_character_ids.length)}`)
        .join(", ");
      finalPrompt = `${prompt} [${positionDesc}]`;
    }
    // 单角色 r2v：自动使用锚点图
    else if (mode === "r2v" && !finalRefImageUrl) {
      const { data: shotRow } = await supabase
        .from("shots")
        .select("reference_character_id")
        .eq("id", shot_id)
        .single();

      if (shotRow?.reference_character_id) {
        const { data: charRow } = await supabase
          .from("characters")
          .select("anchor_image_url")
          .eq("id", shotRow.reference_character_id)
          .single();

        if (charRow?.anchor_image_url) {
          finalRefImageUrl = charRow.anchor_image_url;
        }
      }
    }

    // 提交到 HappyHorse
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

    // 扣除 Credits（原子操作）
    const creditsToConsume = 10000;
    const newBalance = sub.credits_remaining - creditsToConsume;

    // 更新 subscription 余额
    const { error: subErr } = await supabase
      .from("subscriptions")
      .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");
    if (subErr) console.error("[generate] subscriptions update error:", subErr.message);

    // 写入 credit_transactions
    const { error: txErr } = await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "consume",
      amount: -creditsToConsume,
      balance_after: newBalance,
      description: `Generate shot: ${mode}`,
      reference_id: shot_id,
    });
    if (txErr) console.error("[generate] credit_transactions insert error:", txErr.message);

    // 更新 shot 状态
    const shotUpdate: Record<string, unknown> = {
      status: "submitted",
      task_id: result.taskId,
      model: model ?? "happyhorse-1.1-t2v",
      credits_consumed: creditsToConsume,
      updated_at: new Date().toISOString(),
    };

    // 保存多角色引用
    if (Array.isArray(reference_character_ids) && reference_character_ids.length > 0) {
      shotUpdate.reference_character_ids = reference_character_ids;
    }

    const { error: shotErr } = await supabase
      .from("shots")
      .update(shotUpdate)
      .eq("id", shot_id);
    if (shotErr) console.error("[generate] shots update error:", shotErr.message);

    // 写入 generation_logs
    const { error: logErr } = await supabase.from("generation_logs").insert({
      shot_id,
      model: model ?? "happyhorse-1.1-t2v",
      mode,
      task_id: result.taskId,
      status: "submitted",
      credits_consumed: creditsToConsume,
    });
    if (logErr) console.error("[generate] generation_logs insert error:", logErr.message);

    // 启动后台轮询（不阻塞响应）
    pollTaskInBackground(supabase, user.id, shot_id, result.taskId, adapter, creditsToConsume, params);

    return NextResponse.json({
      task_id: result.taskId,
      shot_id,
      status: "submitted",
      credits_consumed: creditsToConsume,
    });
  } catch (error) {
    console.error("[POST /api/generate]", error);
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
  // 4+ 角色
  const positions = ["on the far left", "on the left", "in the center", "on the right", "on the far right"];
  return positions[index] ?? `at position ${index + 1}`;
}

// GET /api/generate — 轮询任务状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const shotId = searchParams.get("shotId");

    if (!taskId && !shotId) {
      return NextResponse.json({ error: "Missing taskId or shotId" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    if (shotId) {
      const { data: shot } = await supabase
        .from("shots")
        .select("*")
        .eq("id", shotId)
        .single();
      return NextResponse.json(shot);
    }

    // 通过 task_id 查找 shot
    const { data: shot } = await supabase
      .from("shots")
      .select("*")
      .eq("task_id", taskId)
      .single();

    if (!shot) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json(shot);
  } catch (error) {
    console.error("[GET /api/generate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 后台轮询逻辑
async function pollTaskInBackground(
  supabase: ReturnType<typeof createServerSupabaseClient> extends Promise<infer T> ? T : never,
  userId: string,
  shotId: string,
  taskId: string,
  adapter: ReturnType<typeof getAdapter>,
  creditsConsumed: number,
  originalParams: GenerateParams
) {
  const MAX_POLLS = 25;
  const POLL_INTERVAL_MS = 10_000;
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000];

  let retryCount = 0;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    try {
      const result = await adapter.poll(taskId);

      // 更新 generation_logs
      const { error: pollLogErr } = await supabase.from("generation_logs").insert({
        shot_id: shotId,
        model: adapter.modelId,
        mode: "t2v",
        task_id: taskId,
        status: result.status,
        video_url: result.videoUrl,
        error_message: result.errorMessage,
        elapsed_seconds: result.elapsedSeconds,
        credits_consumed: result.status === "completed" ? creditsConsumed : 0,
      });
      if (pollLogErr) console.error(`[Poll] generation_logs insert error:`, pollLogErr.message);

      if (result.status === "completed") {
        const { error: completeErr } = await supabase
          .from("shots")
          .update({
            status: "completed",
            video_url: result.videoUrl,
            thumbnail_url: result.thumbnailUrl,
            elapsed_seconds: result.elapsedSeconds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shotId);
        if (completeErr) console.error("[Poll] shots update error (completed):", completeErr.message);

        // 自动执行一致性检查
        try {
          const { data: shotRow } = await supabase
            .from("shots")
            .select("reference_character_id")
            .eq("id", shotId)
            .single();

          let anchorUrl = "";
          if (shotRow?.reference_character_id) {
            const { data: charRow } = await supabase
              .from("characters")
              .select("anchor_image_url")
              .eq("id", shotRow.reference_character_id)
              .single();
            anchorUrl = charRow?.anchor_image_url ?? "";
          }

          if (anchorUrl && result.videoUrl) {
            const consistency = await checkConsistency(shotId, anchorUrl, result.videoUrl);
            const needsReview = consistency.overallScore < 0.6;

            await supabase
              .from("shots")
              .update({
                consistency_score: consistency.overallScore,
                consistency_checks: consistency as unknown as Record<string, unknown>,
                status: needsReview ? "needs_review" : "completed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", shotId);
          }
        } catch (consErr) {
          console.error("[Poll] consistency check error:", consErr);
        }

        return;
      }

      if (result.status === "failed") {
        if (retryCount < MAX_RETRIES) {
          // 指数退避重试
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[retryCount]));
          retryCount++;

          try {
            const retryResult = await adapter.submit(originalParams);
            taskId = retryResult.taskId;
            continue;
          } catch {
            // 重试提交失败，继续轮询原任务
          }
        }

        // 重试耗尽，退还 Credits
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("credits_remaining")
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (sub) {
          const refunded = sub.credits_remaining + creditsConsumed;
          const { error: refundSubErr } = await supabase
            .from("subscriptions")
            .update({ credits_remaining: refunded })
            .eq("user_id", userId)
            .eq("status", "active");
          if (refundSubErr) console.error("[Poll] subscriptions refund update error:", refundSubErr.message);

          const { error: refundTxErr } = await supabase.from("credit_transactions").insert({
            user_id: userId,
            type: "refund",
            amount: creditsConsumed,
            balance_after: refunded,
            description: `Refund for failed generation: ${taskId}`,
            reference_id: shotId,
          });
          if (refundTxErr) console.error("[Poll] credit_transactions refund insert error:", refundTxErr.message);
        }

        const { error: failShotErr } = await supabase
          .from("shots")
          .update({
            status: "failed",
            error_message: result.errorMessage ?? "Generation failed after retries",
            retry_count: retryCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shotId);
        if (failShotErr) console.error("[Poll] shots update error (failed):", failShotErr.message);
        return;
      }
    } catch (error) {
      console.error(`[Poll] Error polling task ${taskId}:`, error);
    }
  }

  // 超时
  const { error: timeoutErr } = await supabase
    .from("shots")
    .update({
      status: "failed",
      error_message: "Generation timed out",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shotId);
  if (timeoutErr) console.error("[Poll] shots update error (timeout):", timeoutErr.message);
}
