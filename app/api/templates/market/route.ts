import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// GET /api/templates/market — F-04: 搜索/筛选 + A-06: 限流
export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`templates-market:${clientIp}`, 60, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const offset = parseInt(searchParams.get("offset") ?? "0");
    const sort = searchParams.get("sort") ?? "latest";
    const q = searchParams.get("q"); // F-04: 关键词搜索
    const modelId = searchParams.get("model_id"); // F-04: 模型筛选
    const mode = searchParams.get("mode"); // F-04: 模式筛选

    let query = supabase
      .from("user_templates")
      .select(`*, profiles(username, avatar_url)`)
      .eq("is_public", true)
      .range(offset, offset + limit - 1);

    if (sort === "popular") {
      query = query.order("use_count", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // F-04: 搜索和筛选
    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }
    if (modelId) {
      query = query.eq("model_id", modelId);
    }
    if (mode) {
      query = query.eq("mode", mode);
    }

    const { data: templates, error } = await query;

    if (error) {
      logger.error("templates/market", error);
      return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }

    const { count: total } = await supabase
      .from("user_templates")
      .select("*", { count: "exact", head: true })
      .eq("is_public", true);

    return NextResponse.json({
      templates: templates ?? [],
      total: total ?? 0,
      limit,
      offset,
    }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    });
  } catch (error) {
    logger.error("templates/market", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
