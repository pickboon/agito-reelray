import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST /api/shots/batch — 批量操作镜头
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`shots-batch:${clientIp}`, 20, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { shot_ids, action, status } = body;

    if (!Array.isArray(shot_ids) || shot_ids.length === 0) {
      return NextResponse.json({ error: "shot_ids must be a non-empty array" }, { status: 400 });
    }

    // L-10: 批量操作上限
    if (shot_ids.length > 100) {
      return NextResponse.json({ error: "Maximum 100 items per batch" }, { status: 400 });
    }

    if (!["delete", "update_status"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "update_status" && !status) {
      return NextResponse.json({ error: "status is required for update_status action" }, { status: 400 });
    }

    // 验证所有 shot 属于用户的项目
    const { data: shots, error: fetchError } = await supabase
      .from("shots")
      .select("id, episodes(id, project_id, projects(user_id))")
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

    // 执行批量操作
    if (action === "delete") {
      const { error } = await supabase
        .from("shots")
        .delete()
        .in("id", shot_ids);

      if (error) {
        logger.error("shots/batch/delete", error);
        return NextResponse.json({ error: "Failed to delete shots" }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: shot_ids.length });
    }

    if (action === "update_status") {
      const { error } = await supabase
        .from("shots")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .in("id", shot_ids);

      if (error) {
        logger.error("shots/batch/update", error);
        return NextResponse.json({ error: "Failed to update shots status" }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: shot_ids.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    logger.error("shots/batch", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
