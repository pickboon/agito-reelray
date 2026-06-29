import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";
import { logger } from "@/lib/logger";

// POST /api/community/publish — 发布作品到社区
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`community-publish:${clientIp}`, 30, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { task_id, title, description } = body;

    if (!task_id || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // D-01/S-05: 内容审核
    const textToModerate = `${title} ${description ?? ""}`;
    const modResult = await moderateText(textToModerate);
    if (!modResult.pass) {
      return NextResponse.json(
        { error: `内容未通过审核：${modResult.reason}` },
        { status: 422 }
      );
    }

    // 验证 task 属于当前用户且已完成
    const { data: task, error: taskError } = await supabase
      .from("generation_tasks")
      .select("id, status, video_url")
      .eq("id", task_id)
      .eq("user_id", user.id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    if (task.status !== "completed" || !task.video_url) {
      return NextResponse.json({ error: "Task must be completed with video" }, { status: 400 });
    }

    // 检查是否已发布
    const { data: existing } = await supabase
      .from("community_posts")
      .select("id")
      .eq("task_id", task_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "This video has already been published" }, { status: 409 });
    }

    const { data: post, error } = await supabase
      .from("community_posts")
      .insert({
        user_id: user.id,
        task_id,
        title: title.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      logger.error("community/publish", error);
      return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    logger.error("community/publish", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
