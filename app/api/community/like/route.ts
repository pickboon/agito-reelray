import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// POST /api/community/like — F-05: 使用原子 RPC 更新点赞数
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`community-like:${clientIp}`, 60, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { post_id } = body;

    if (!post_id) {
      return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
    }

    // 验证作品存在
    const { data: post } = await supabase
      .from("community_posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // 检查是否已点赞
    const { data: existingLike } = await supabase
      .from("community_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", post_id)
      .single();

    if (existingLike) {
      // 取消点赞
      await supabase
        .from("community_likes")
        .delete()
        .eq("user_id", user.id)
        .eq("post_id", post_id);

      // F-05: 原子递减
      const { data: newCount } = await supabase.rpc("increment_likes", {
        p_post_id: post_id,
        p_delta: -1,
      });

      return NextResponse.json({ liked: false, likes_count: newCount ?? 0 });
    } else {
      // 点赞
      await supabase
        .from("community_likes")
        .insert({ user_id: user.id, post_id });

      // F-05: 原子递增
      const { data: newCount } = await supabase.rpc("increment_likes", {
        p_post_id: post_id,
        p_delta: 1,
      });

      return NextResponse.json({ liked: true, likes_count: newCount ?? 0 });
    }
  } catch (error) {
    logger.error("community/like", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET /api/community/like — 查询当前用户是否已点赞
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json({ error: "Missing post_id" }, { status: 400 });
    }

    const { data: like } = await supabase
      .from("community_likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    return NextResponse.json({ liked: !!like });
  } catch (error) {
    logger.error("community/like/get", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
