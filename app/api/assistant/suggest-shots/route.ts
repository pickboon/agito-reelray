import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callAssistantJSON } from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { script, characters } = await request.json();
    if (!script) return NextResponse.json({ error: "Script is required" }, { status: 400 });

    const result = await callAssistantJSON<{
      shots: {
        shot_number: number;
        type: string;
        description: string;
        prompt: string;
        duration: number;
        character: string;
      }[];
    }>(
      `You are Atlas, a cinematography expert for AI-generated short dramas.
      Break down the script into individual shots. For each shot provide:
      - shot_number: sequential number
      - type: shot type (wide/medium/close-up/extreme-close-up)
      - description: brief action description
      - prompt: detailed generation prompt optimized for HappyHorse API
      - duration: recommended duration in seconds (3-10)
      - character: main character in shot
      Keep prompts visual and specific. Include lighting, camera angle, and mood.`,
      `Script: ${script}\nCharacters: ${JSON.stringify(characters ?? [])}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/assistant/suggest-shots]", error);
    return NextResponse.json({ error: "Shot suggestion failed" }, { status: 500 });
  }
}
