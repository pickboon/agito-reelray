/**
 * 保存编辑器时间轴状态
 * POST /api/editor/save
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`editor-save:${clientIp}`, 60, 60000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { episodeId, state } = await request.json();

    if (!episodeId || !state) {
      return NextResponse.json(
        { error: "缺少 episodeId 或 state" },
        { status: 400 }
      );
    }

    // 验证 episode 归属
    const { data: episode } = await supabase
      .from("episodes")
      .select("id, project_id")
      .eq("id", episodeId)
      .single();

    if (!episode) {
      return NextResponse.json({ error: "集不存在" }, { status: 404 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", episode.project_id)
      .eq("user_id", user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    // UPSERT 时间轴状态
    const { error } = await supabase.from("editor_timelines").upsert(
      {
        episode_id: episodeId,
        user_id: user.id,
        state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "episode_id" }
    );

    if (error) {
      console.error("[Editor Save]", error);
      return NextResponse.json(
        { error: "保存失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[Editor Save]", e);
    return NextResponse.json(
      { error: "保存请求异常" },
      { status: 500 }
    );
  }
}
