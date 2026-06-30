import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// GET /api/community/leaderboard — 公开排行榜：全站播放量 Top 3
export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`community-leaderboard:${clientIp}`, 30, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();

    const { data: topPosts, error } = await supabase
      .from("community_posts")
      .select(`
        id,
        user_id,
        title,
        likes_count,
        views_count,
        created_at,
        generation_tasks(video_url, thumbnail_url),
        profiles(username, avatar_url)
      `)
      .eq("is_public", true)
      .order("views_count", { ascending: false })
      .limit(3);

    if (error) {
      logger.error("community/leaderboard", error);
      return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
    }

    return NextResponse.json(
      { top_posts: topPosts ?? [] },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      }
    );
  } catch (error) {
    logger.error("community/leaderboard", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
