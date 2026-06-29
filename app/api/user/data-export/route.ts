import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

// GET /api/user/data-export — 导出用户所有数据为 JSON
export async function GET(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [projects, characters, shots, templates, communityPosts, subscription] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", user.id),
      supabase.from("characters").select("*, projects!inner(id)").eq("projects.user_id", user.id),
      supabase.from("shots").select("*, episodes(projects!inner(id))").eq("episodes.projects.user_id", user.id),
      supabase.from("user_templates").select("*").eq("user_id", user.id),
      supabase.from("community_posts").select("*").eq("user_id", user.id),
      supabase.from("subscriptions").select("plan, credits_remaining, credits_total, created_at").eq("user_id", user.id).single(),
    ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, email: user.email, created_at: user.created_at },
      subscription: subscription.data,
      projects: projects.data ?? [],
      characters: characters.data ?? [],
      shots: shots.data ?? [],
      templates: templates.data ?? [],
      community_posts: communityPosts.data ?? [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="reelray-data-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    logger.error("user/data-export", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
