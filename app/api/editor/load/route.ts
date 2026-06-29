/**
 * 加载编辑器时间轴状态
 * GET /api/editor/load?episodeId=xxx
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get("episodeId");

  if (!episodeId) {
    return NextResponse.json(
      { error: "缺少 episodeId" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("editor_timelines")
      .select("state, version, updated_at")
      .eq("episode_id", episodeId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[Editor Load]", error);
      return NextResponse.json(
        { error: "加载失败" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ state: null });
    }

    return NextResponse.json({
      state: data.state,
      version: data.version,
      updatedAt: data.updated_at,
    });
  } catch (e) {
    console.error("[Editor Load]", e);
    return NextResponse.json(
      { error: "加载请求异常" },
      { status: 500 }
    );
  }
}
