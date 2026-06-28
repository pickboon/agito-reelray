import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";
import { callAssistantJSON } from "@/lib/assistant";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { shot_id, video_url, reference_image_url } = await request.json();
    if (!shot_id) return NextResponse.json({ error: "shot_id is required" }, { status: 400 });

    // 获取 shot 信息
    const { data: shot } = await supabase.from("shots").select("*").eq("id", shot_id).single();

    const result = await callAssistantJSON<{
      score: number;
      feedback: string;
      suggestions: string[];
    }>(
      `You are Atlas, a quality assessment expert for AI-generated video content.
      Score the video generation from 1-5 based on:
      - Character consistency (if reference image provided)
      - Visual quality and clarity
      - Prompt adherence
      - Cinematic quality (lighting, composition)
      Provide specific, actionable feedback.
      Score scale: 1=Poor 2=Below Average 3=Acceptable 4=Good 5=Excellent`,
      `Shot prompt: ${shot?.prompt ?? "Unknown"}\nVideo URL: ${video_url ?? "N/A"}\nReference image: ${reference_image_url ?? "None"}`
    );

    // 保存评分到 shot
    if (result.score >= 1 && result.score <= 5) {
      await supabase.from("shots").update({ quality_score: result.score }).eq("id", shot_id);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/assistant/score]", error);
    return NextResponse.json({ error: "Scoring failed" }, { status: 500 });
  }
}
