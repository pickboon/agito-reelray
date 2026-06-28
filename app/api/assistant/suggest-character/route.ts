import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callAssistantJSON } from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { script, character_name } = await request.json();
    if (!character_name) {
      return NextResponse.json({ error: "character_name is required" }, { status: 400 });
    }

    const result = await callAssistantJSON<{
      prompt_suggestion: string;
      style_suggestion: string;
      warnings: string[];
    }>(
      `You are Atlas, an expert in AI video generation character design.
      Given the script context and character name, provide:
      1. A detailed visual prompt for generating this character (for r2v/reference image)
      2. Style suggestions (clothing, expressions, posture)
      3. Warnings about potential r2v stability issues
      Be specific about visual details that work well with AI video generation.`,
      `Script: ${script ?? "No script provided"}\nCharacter: ${character_name}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/assistant/suggest-character]", error);
    return NextResponse.json({ error: "Suggestion failed" }, { status: 500 });
  }
}
