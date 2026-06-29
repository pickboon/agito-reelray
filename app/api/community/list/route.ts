import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// GET /api/community/list — F-03: 游标分页 + A-05: 公开列表限流
export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`community-list:${clientIp}`, 60, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const cursor = searchParams.get("cursor"); // F-03: 游标分页
    const sort = searchParams.get("sort") ?? "latest";

    let query = supabase
      .from("community_posts")
      .select(`
        *,
        generation_tasks(video_url, thumbnail_url, prompt),
        profiles(username, avatar_url)
      `)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // +1 to determine has_more

    if (sort === "popular") {
      query = query.order("likes_count", { ascending: false });
    }

    // F-03: 游标分页
    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: posts, error } = await query;

    if (error) {
      logger.error("community/list", error);
      return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
    }

    const hasMore = (posts ?? []).length > limit;
    const resultPosts = (posts ?? []).slice(0, limit);
    const nextCursor = hasMore && resultPosts.length > 0
      ? resultPosts[resultPosts.length - 1].created_at
      : null;

    return NextResponse.json({
      posts: resultPosts,
      next_cursor: nextCursor,
      has_more: hasMore,
      limit,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (error) {
    logger.error("community/list", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
