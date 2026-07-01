// ============================================================
// POST /api/audio/tts — DashScope TTS 配音
// 调用 DashScope OpenAI-compatible audio/speech endpoint
// 与 HappyHorse 共用 HAPPYHORSE_API_KEY
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { validateCsrf } from "@/lib/csrf";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// DashScope TTS voice mapping (frontend label → DashScope voice ID)
const VOICE_MAP: Record<string, string> = {
  "赛博女声-冷酷": "longxiaochun_v2",
  "赛博男声-低沉": "longshuo",
  "少女-清亮": "longxiaoxia",
  "老者-沙哑": "longlaotie",
  "机械-合成": "longjing",
};

// In-memory rate limiter: userId → { count, resetAt }
const rateLimit = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimit.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // CSRF 校验
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    // Auth
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        { error: "请求过于频繁，请稍后再试" },
        { status: 429 }
      );
    }

    // Parse body
    const body = await request.json();
    const { text, voice: voiceLabel, speech_rate, emotion } = body as {
      text?: string;
      voice?: string;
      speech_rate?: number;
      emotion?: string;
    };

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "合成文本不能为空" }, { status: 400 });
    }

    if (text.length > 300) {
      return NextResponse.json(
        { error: "合成文本不能超过300字" },
        { status: 400 }
      );
    }

    const apiKey = process.env.HAPPYHORSE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "TTS 服务未配置" },
        { status: 500 }
      );
    }

    // Resolve voice ID
    const voiceId = VOICE_MAP[voiceLabel ?? ""] ?? "longxiaochun_v2";

    // Build prompt prefix for emotion
    let promptText = text.trim();
    if (emotion === "angry") {
      promptText = `用愤怒的语气说：${promptText}`;
    } else if (emotion === "sad") {
      promptText = `用悲伤的语气说：${promptText}`;
    }

    // Call DashScope OpenAI-compatible audio/speech endpoint
    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/audio/speech",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "cosyvoice-v2",
          input: promptText,
          voice: voiceId,
          response_format: "mp3",
          speed: speech_rate ?? 1.0,
        }),
      }
    );

    if (!response.ok) {
      let errorMsg = "TTS 合成失败";
      try {
        const err = await response.json();
        errorMsg = err.error?.message ?? err.message ?? errorMsg;
      } catch {
        errorMsg = `TTS 服务返回 ${response.status}`;
      }
      console.error("[TTS] DashScope error:", response.status, errorMsg);
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[POST /api/audio/tts]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
