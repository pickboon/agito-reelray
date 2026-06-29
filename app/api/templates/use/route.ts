import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

// POST /api/templates/use — L-08: 原子递增模板 use_count
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { template_id } = body;

    if (!template_id) {
      return NextResponse.json({ error: "Missing template_id" }, { status: 400 });
    }

    // 验证模板存在
    const { data: template } = await supabase
      .from("user_templates")
      .select("id, prompt, model_id, mode, aspect_ratio, duration, seed")
      .eq("id", template_id)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // 原子递增 use_count
    await supabase.rpc("increment_use_count", { p_template_id: template_id });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    logger.error("templates/use", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
