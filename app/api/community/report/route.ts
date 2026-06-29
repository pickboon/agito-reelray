import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const VALID_REASONS = ["spam", "inappropriate", "copyright", "harassment", "other"];

// POST /api/community/report — 举报社区帖子
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`community-report:${clientIp}`, 10, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { post_id, reason, details } = body;

    if (!post_id || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    // 验证帖子存在
    const { data: post } = await supabase
      .from("community_posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("content_reports")
      .insert({
        reporter_id: user.id,
        target_type: "post",
        target_id: post_id,
        reason,
        details: details?.trim() || null,
      });

    if (error) {
      logger.error("community/report", error);
      return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("community/report", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
