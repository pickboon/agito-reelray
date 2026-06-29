import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";
import { logger } from "@/lib/logger";

// POST /api/templates/save — 保存当前参数为模板
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`templates-save:${clientIp}`, 30, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, description, prompt, model_id, mode, aspect_ratio, duration, seed } = body;

    if (!name || !prompt || !model_id || !mode || !aspect_ratio || !duration) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // D-01/S-05: 内容审核
    const textToModerate = `${name} ${description ?? ""} ${prompt}`;
    const modResult = await moderateText(textToModerate);
    if (!modResult.pass) {
      return NextResponse.json(
        { error: `内容未通过审核：${modResult.reason}` },
        { status: 422 }
      );
    }

    const { data: template, error } = await supabase
      .from("user_templates")
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        prompt: prompt.trim(),
        model_id,
        mode,
        aspect_ratio,
        duration,
        seed: seed ?? null,
      })
      .select()
      .single();

    if (error) {
      logger.error("templates/save", error);
      return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error("templates/save", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
