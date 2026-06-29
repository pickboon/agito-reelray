import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST /api/batch — 批量生成镜头（简化队列方案）
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`batch-generate:${clientIp}`, 10, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { shot_ids, model, mode, aspect_ratio, duration } = body;

    if (!Array.isArray(shot_ids) || shot_ids.length === 0) {
      return NextResponse.json({ error: "shot_ids must be a non-empty array" }, { status: 400 });
    }

    if (shot_ids.length > 20) {
      return NextResponse.json({ error: "Maximum 20 shots per batch" }, { status: 400 });
    }

    // 验证所有 shot 属于用户的项目
    const { data: shots, error: fetchError } = await supabase
      .from("shots")
      .select("id, prompt, reference_character_id, reference_character_ids, episodes(id, project_id, projects(user_id))")
      .in("id", shot_ids);

    if (fetchError || !shots) {
      return NextResponse.json({ error: "Failed to fetch shots" }, { status: 500 });
    }

    // 验证权限
    for (const shot of shots) {
      const ep = shot.episodes as unknown as { projects: { user_id: string } };
      const projectUserId = (ep.projects as { user_id: string }).user_id;

      if (projectUserId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // L-06: 原子预扣总积分
    const creditsPerShot = 10000;
    const totalCreditsNeeded = creditsPerShot * shot_ids.length;

    const { error: deductErr } = await supabase.rpc("deduct_credits", {
      p_user_id: user.id,
      p_amount: totalCreditsNeeded,
    });

    if (deductErr) {
      if (deductErr.message?.includes("Insufficient")) {
        return NextResponse.json({
          error: "Insufficient balance",
          required: totalCreditsNeeded,
        }, { status: 402 });
      }
      return NextResponse.json({ error: "Credits deduction failed" }, { status: 500 });
    }

    // 返回批量任务信息，前端将逐个调用 /api/generate
    const batchId = crypto.randomUUID();

    return NextResponse.json({
      batch_id: batchId,
      total: shot_ids.length,
      shots: shots.map((s) => ({
        id: s.id,
        prompt: s.prompt,
        reference_character_id: s.reference_character_id,
        reference_character_ids: s.reference_character_ids,
      })),
      params: {
        model: model ?? "happyhorse-1.1",
        mode: mode ?? "t2v",
        aspect_ratio: aspect_ratio ?? "9:16",
        duration: duration ?? 5,
      },
      credits_per_shot: creditsPerShot,
      total_credits: totalCreditsNeeded,
    });
  } catch (error) {
    logger.error("batch", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/batch — 查询批量任务进度
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const shotIds = searchParams.get("shot_ids")?.split(",") ?? [];

    if (shotIds.length === 0) {
      return NextResponse.json({ error: "shot_ids parameter required" }, { status: 400 });
    }

    const { data: shots } = await supabase
      .from("shots")
      .select("id, status, task_id, video_url, error_message")
      .in("id", shotIds);

    const statusCounts = {
      pending: 0,
      submitted: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      needs_review: 0,
    };

    (shots ?? []).forEach((shot) => {
      if (shot.status in statusCounts) {
        statusCounts[shot.status as keyof typeof statusCounts]++;
      }
    });

    return NextResponse.json({
      total: shotIds.length,
      progress: statusCounts,
      shots: shots ?? [],
    });
  } catch (error) {
    logger.error("batch/get", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
