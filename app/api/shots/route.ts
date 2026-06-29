import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

// POST /api/shots — 创建镜头
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`shots-create:${clientIp}`, 20, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { episode_id, prompt, reference_character_id } = body;

    if (!episode_id || !prompt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 验证 episode 属于用户的项目
    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .select("id, project_id, projects(user_id)")
      .eq("id", episode_id)
      .single();

    if (epError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const projectUserId = Array.isArray(episode.projects) 
      ? (episode.projects[0] as { user_id: string }).user_id 
      : (episode.projects as { user_id: string }).user_id;

    if (projectUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 计算下一个 shot_number
    const { data: lastShot } = await supabase
      .from("shots")
      .select("shot_number")
      .eq("episode_id", episode_id)
      .order("shot_number", { ascending: false })
      .limit(1)
      .single();

    const nextNumber = (lastShot?.shot_number ?? 0) + 1;

    // 创建 shot
    const { data: shot, error } = await supabase
      .from("shots")
      .insert({
        episode_id,
        shot_number: nextNumber,
        prompt: prompt.trim(),
        reference_character_id: reference_character_id || null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/shots]", error);
      return NextResponse.json({ error: "Failed to create shot" }, { status: 500 });
    }

    return NextResponse.json(shot, { status: 201 });
  } catch (error) {
    console.error("[POST /api/shots]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
