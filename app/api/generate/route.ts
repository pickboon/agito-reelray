import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { getAdapter } from "@/lib/adapters";
import type { GenerateParams } from "@/lib/adapters";

// POST /api/generate — 提交生成任务
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { shot_id, model, mode, prompt, reference_image_url, aspect_ratio, duration, seed } = body;

    if (!shot_id || !prompt || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    // 提交到 HappyHorse
    const adapter = getAdapter(model ?? "happyhorse-1.1");
    const params: GenerateParams = {
      prompt,
      mode,
      referenceImageUrl: reference_image_url,
      aspectRatio: aspect_ratio ?? "9:16",
      duration: duration ?? 5,
      seed,
    };

    const result = await adapter.submit(params);

    // 扣除 Credits（原子操作）
    const creditsToConsume = 10000;
    const newBalance = sub.credits_remaining - creditsToConsume;

    // 更新 subscription 余额
    await supabase
      .from("subscriptions")
      .update({ credits_remaining: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "active");

    // 写入 credit_transactions
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "consume",
      amount: -creditsToConsume,
      balance_after: newBalance,
      description: `Generate shot: ${mode}`,
      reference_id: shot_id,
    });

    // 更新 shot 状态
    await supabase
      .from("shots")
      .update({
        status: "submitted",
        task_id: result.taskId,
        model: model ?? "happyhorse-1.1-t2v",
        credits_consumed: creditsToConsume,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shot_id);

    // 写入 generation_logs
    await supabase.from("generation_logs").insert({
      shot_id,
      model: model ?? "happyhorse-1.1-t2v",
      mode,
      task_id: result.taskId,
      status: "submitted",
      credits_consumed: creditsToConsume,
    });

    // 启动后台轮询（不阻塞响应）
    pollTaskInBackground(supabase, user.id, shot_id, result.taskId, adapter, creditsToConsume);

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
  creditsConsumed: number
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
      await supabase.from("generation_logs").insert({
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

      if (result.status === "completed") {
        await supabase
          .from("shots")
          .update({
            status: "completed",
            video_url: result.videoUrl,
            thumbnail_url: result.thumbnailUrl,
            elapsed_seconds: result.elapsedSeconds,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shotId);
        return;
      }

      if (result.status === "failed") {
        if (retryCount < MAX_RETRIES) {
          // 指数退避重试
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[retryCount]));
          retryCount++;

          try {
            const retryResult = await adapter.submit({
              prompt: "", // 从 shot 获取
              mode: "t2v",
              aspectRatio: "9:16",
              duration: 5,
            });
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
          await supabase
            .from("subscriptions")
            .update({ credits_remaining: refunded })
            .eq("user_id", userId)
            .eq("status", "active");

          await supabase.from("credit_transactions").insert({
            user_id: userId,
            type: "refund",
            amount: creditsConsumed,
            balance_after: refunded,
            description: `Refund for failed generation: ${taskId}`,
            reference_id: shotId,
          });
        }

        await supabase
          .from("shots")
          .update({
            status: "failed",
            error_message: result.errorMessage ?? "Generation failed after retries",
            retry_count: retryCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", shotId);
        return;
      }
    } catch (error) {
      console.error(`[Poll] Error polling task ${taskId}:`, error);
    }
  }

  // 超时
  await supabase
    .from("shots")
    .update({
      status: "failed",
      error_message: "Generation timed out",
      updated_at: new Date().toISOString(),
    })
    .eq("id", shotId);
}
