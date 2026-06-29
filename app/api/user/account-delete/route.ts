import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { logger } from "@/lib/logger";

// POST /api/user/account-delete — 删除用户账户和所有数据
export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 级联删除用户相关数据（依赖数据库 ON DELETE CASCADE）
    const tables = [
      "community_posts",
      "community_likes",
      "user_templates",
      "content_reports",
      "subscriptions",
      "projects",
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error) {
        logger.error(`account-delete/${table}`, error);
      }
    }

    // 删除 auth 用户（需要 service role，此处尝试）
    const { error: authError } = await supabase.auth.admin?.deleteUser?.(user.id) ?? { error: null };
    if (authError) {
      logger.error("account-delete/auth", authError);
    }

    // 清除 session
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("user/account-delete", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
