import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getR2SignedUrl } from "@/lib/r2";
import { logger } from "@/lib/logger";

// GET /api/generation/download?task_id=xxx — 获取视频下载签名 URL
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");

    if (!taskId) {
      return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
    }

    // 查询任务并验证归属
    const { data: task, error } = await supabase
      .from("generation_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
    }

    if (task.status !== "completed" || !task.video_url) {
      return NextResponse.json({ error: "Video not ready for download" }, { status: 400 });
    }

    // 从 video_url 提取 R2 key
    const r2PublicUrl = process.env.R2_PUBLIC_URL;
    if (!r2PublicUrl) {
      return NextResponse.json({ error: "R2 configuration error" }, { status: 500 });
    }

    const r2Key = task.video_url.replace(`${r2PublicUrl}/`, "");
    if (!r2Key || r2Key === task.video_url) {
      return NextResponse.json({ error: "Invalid video URL format" }, { status: 500 });
    }

    // 生成签名 URL（有效期 1 小时）
    const signedUrl = await getR2SignedUrl(r2Key, 900);

    // A-04: 日志记录下载请求
    logger.info("generation/download", "Download requested: user=" + user.id + " task=" + taskId);
    
    return NextResponse.json({
      success: true,
      download_url: signedUrl,
      expires_in: 900,
    }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/generation/download]", error);
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }
}
