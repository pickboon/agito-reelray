import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { callAssistantJSON } from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { script } = await request.json();
    if (!script) return NextResponse.json({ error: "Script is required" }, { status: 400 });

    const result = await callAssistantJSON<{
      characters: { name: string; role: string; description: string }[];
      scenes: { name: string; description: string; shot_count: number }[];
      suggestions: string[];
      recommended_template: string;
    }>(
      `You are Atlas, an expert short drama production assistant. Analyze the script and identify:
      1. All characters (name, role, brief visual description)
      2. Key scenes (name, description, estimated shot count)
      3. Production suggestions (issues, improvements)
      4. Best matching template (revenge/romance/thriller/fantasy)
      Be concise and actionable.`,
      script
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/assistant/analyze-script]", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
