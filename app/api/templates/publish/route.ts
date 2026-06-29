import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";
import { logger } from "@/lib/logger";

// POST /api/templates/publish — 发布模板到市场
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`templates-publish:${clientIp}`, 60, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { template_id, is_public } = body;

    if (!template_id) {
      return NextResponse.json({ error: "Missing template_id" }, { status: 400 });
    }

    // D-07: 发布到市场前审核模板内容
    const { data: existing } = await supabase
      .from("user_templates")
      .select("name, description, prompt")
      .eq("id", template_id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      const textToModerate = `${existing.name} ${existing.description ?? ""} ${existing.prompt}`;
      const modResult = await moderateText(textToModerate);
      if (!modResult.pass) {
        return NextResponse.json(
          { error: `模板内容未通过审核：${modResult.reason}` },
          { status: 422 }
        );
      }
    }

    const { data: template, error } = await supabase
      .from("user_templates")
      .update({ is_public: is_public ?? true, updated_at: new Date().toISOString() })
      .eq("id", template_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      logger.error("templates/publish", error);
      return NextResponse.json({ error: "Failed to publish template" }, { status: 500 });
    }

    return NextResponse.json(template);
  } catch (error) {
    logger.error("templates/publish", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
