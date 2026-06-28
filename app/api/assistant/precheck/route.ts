import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { shot_id, prompt } = await request.json();
    if (!prompt) return NextResponse.json({ error: "Prompt is required" }, { status: 400 });

    // 纯规则检查，不调用 LLM
    const warnings: { level: "info" | "warning" | "error"; message: string }[] = [];

    if (prompt.length < 10) {
      warnings.push({ level: "warning", message: "Prompt is very short. Add more visual details for better results." });
    }
    if (prompt.length > 500) {
      warnings.push({ level: "warning", message: "Prompt is very long. Consider simplifying for more consistent results." });
    }
    if (/violence|blood|weapon|gun|knife/i.test(prompt)) {
      warnings.push({ level: "warning", message: "This prompt may trigger content safety filters." });
    }
    if (/nude|naked|sexual/i.test(prompt)) {
      warnings.push({ level: "error", message: "This prompt will likely be rejected by content moderation." });
    }

    const estimatedCredits = 10000;
    const estimatedTime = 120; // 秒

    return NextResponse.json({
      warnings,
      estimated_time: estimatedTime,
      estimated_credits: estimatedCredits,
    });
  } catch (error) {
    console.error("[POST /api/assistant/precheck]", error);
    return NextResponse.json({ error: "Precheck failed" }, { status: 500 });
  }
}
