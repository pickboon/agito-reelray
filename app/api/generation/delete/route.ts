import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export async function DELETE(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`generation-delete:${clientIp}`, 20, 60000))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
    }

    // 检查任务是否存在且属于用户
    const { data: task } = await supabase
      .from("generation_tasks")
      .select("id")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // FK 检查：是否有社区帖子引用此任务
    const confirm = searchParams.get("confirm") === "true";
    const { data: communityPost } = await supabase
      .from("community_posts")
      .select("id, title")
      .eq("task_id", taskId)
      .single();

    if (communityPost && !confirm) {
      return NextResponse.json({
        error: "此视频已发布到社区，删除任务将同时删除社区帖子",
        community_post: communityPost,
        confirm_required: true,
      }, { status: 409 });
    }

    // 如果确认删除，先删除社区帖子
    if (communityPost && confirm) {
      await supabase
        .from("community_posts")
        .delete()
        .eq("id", communityPost.id);
    }

    // 执行删除
    const { error } = await supabase
      .from("generation_tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error("Delete task error:", error);
      return NextResponse.json({ error: "删除失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete task error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
