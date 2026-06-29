/**
 * 导出编辑器时间轴为视频
 * POST /api/editor/export
 *
 * MVP 实现：API Route + FFmpeg 子进程
 * 后续可迁移到独立任务队列
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { spawn } from "child_process";
import { writeFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { EditorTimeline, TimelineClip } from "@/lib/editor/types";
import { toFFmpegTransition } from "@/lib/editor/effects/transitions";

/** 积分计算 */
function calculateCredits(totalDurationSec: number, resolution: string): number {
  const minutes = totalDurationSec / 60;
  const baseRate = resolution === "1080p" ? 10000 : 5000;

  if (minutes <= 1) return baseRate;
  if (minutes <= 3) return baseRate * 2;
  return Math.ceil(baseRate * minutes);
}

/** 构建 FFmpeg 命令 */
function buildFFmpegCommand(
  timeline: EditorTimeline,
  outputPath: string
): { args: string[]; tempFiles: string[] } {
  const args: string[] = [];
  const tempFiles: string[] = [];
  const clips = [...timeline.clips].sort(
    (a, b) => a.startTime - b.startTime
  );

  if (clips.length === 0) {
    return { args: [], tempFiles: [] };
  }

  // 添加输入文件
  for (const clip of clips) {
    args.push("-ss", clip.trimStart.toString());
    args.push("-t", clip.duration.toString());
    args.push("-i", clip.sourceUrl);
  }

  // 添加 BGM 输入
  for (const audio of timeline.audioTracks) {
    args.push("-i", audio.url);
  }

  // 构建 filter complex
  const filterParts: string[] = [];
  let lastLabel = "";

  // 处理视频片段串联
  if (clips.length === 1) {
    filterParts.push(`[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v0]`);
    lastLabel = "v0";
  } else {
    // 逐个缩放
    for (let i = 0; i < clips.length; i++) {
      filterParts.push(
        `[${i}:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v${i}]`
      );
    }

    // 应用转场 xfade
    let prevLabel = "v0";
    let offset = 0;

    for (let i = 0; i < clips.length - 1; i++) {
      const clip = clips[i];
      const nextClip = clips[i + 1];
      offset += clip.duration;

      const outLabel = `xf${i}`;

      if (clip.transitionOut) {
        const ffmpegTrans = toFFmpegTransition(clip.transitionOut);
        const xfadeOffset = Math.max(0, offset - ffmpegTrans.duration);

        filterParts.push(
          `[${prevLabel}][v${i + 1}]xfade=transition=${ffmpegTrans.transition}:duration=${ffmpegTrans.duration}:offset=${xfadeOffset}[${outLabel}]`
        );
        offset -= ffmpegTrans.duration;
      } else {
        // 无转场，使用 concat
        filterParts.push(
          `[${prevLabel}][v${i + 1}]concat=n=2:v=1:a=0[${outLabel}]`
        );
      }

      prevLabel = outLabel;
    }
    lastLabel = prevLabel;
  }

  // 音频混合
  if (clips.length > 0) {
    // 简单方案：取第一个片段的音频
    filterParts.push(`[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a0]`);
  }

  // 应用 filter
  if (filterParts.length > 0) {
    args.push("-filter_complex", filterParts.join(";"));
    args.push("-map", `[${lastLabel}]`);
    args.push("-map", "[a0]");
  }

  // 输出参数
  args.push(
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    "-y",
    outputPath
  );

  return { args, tempFiles };
}

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
  }

  // F-06: FFmpeg 可用性检测
  try {
    const { execSync } = await import("child_process");
    execSync("which ffmpeg", { stdio: "ignore" });
  } catch {
    return NextResponse.json(
      { error: "视频导出功能在当前部署环境不可用，请在本地开发环境使用" },
      { status: 503 }
    );
  }

  const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!(await checkRateLimit(`editor-export:${clientIp}`, 10, 60000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { episodeId, timeline } = (await request.json()) as {
      episodeId: string;
      timeline: EditorTimeline;
    };

    if (!episodeId || !timeline) {
      return NextResponse.json(
        { error: "缺少参数" },
        { status: 400 }
      );
    }

    // 检查片段数量
    if (timeline.clips.length === 0) {
      return NextResponse.json(
        { error: "时间轴没有视频片段" },
        { status: 400 }
      );
    }

    // 计算总时长和积分
    const totalDuration = timeline.clips.reduce(
      (sum, c) => {
        const transDur = c.transitionOut ? c.transitionOut.duration : 0;
        return sum + c.duration - transDur;
      },
      0
    );
    const credits = calculateCredits(totalDuration, "720p");

    // 检查积分余额
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("credits_remaining")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!sub || sub.credits_remaining < credits) {
      return NextResponse.json(
        { error: `积分不足，需要 ${credits.toLocaleString()} 积分` },
        { status: 402 }
      );
    }

    // 保存时间轴
    const { data: savedTimeline } = await supabase
      .from("editor_timelines")
      .upsert(
        {
          episode_id: episodeId,
          user_id: user.id,
          state: timeline as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "episode_id" }
      )
      .select("id")
      .single();

    if (!savedTimeline) {
      return NextResponse.json(
        { error: "保存时间轴失败" },
        { status: 500 }
      );
    }

    // 创建导出任务
    const { data: job } = await supabase
      .from("export_jobs")
      .insert({
        timeline_id: savedTimeline.id,
        user_id: user.id,
        status: "pending",
        credits_consumed: credits,
      })
      .select("id")
      .single();

    if (!job) {
      return NextResponse.json(
        { error: "创建导出任务失败" },
        { status: 500 }
      );
    }

    // 后台执行 FFmpeg（非阻塞返回）
    const outputDir = join(tmpdir(), "reelray-exports");
    await mkdir(outputDir, { recursive: true });
    const outputPath = join(outputDir, `${job.id}.mp4`);

    // 构建命令
    const { args, tempFiles } = buildFFmpegCommand(timeline, outputPath);

    if (args.length === 0) {
      return NextResponse.json(
        { error: "无法构建 FFmpeg 命令" },
        { status: 500 }
      );
    }

    // 异步执行 FFmpeg（不等待完成）
    processFFmpegAsync(job.id, args, outputPath, credits, user.id, supabase);

    // 扣除积分
    await supabase
      .from("subscriptions")
      .update({
        credits_remaining: sub.credits_remaining - credits,
      })
      .eq("user_id", user.id)
      .eq("status", "active");

    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      type: "consume",
      amount: -credits,
      balance_after: sub.credits_remaining - credits,
      description: `视频导出: ${totalDuration.toFixed(1)}s`,
      reference_id: job.id,
    });

    return NextResponse.json({
      success: true,
      jobId: job.id,
      credits,
      message: `导出任务已提交（${credits.toLocaleString()} 积分）`,
    });
  } catch (e) {
    console.error("[Editor Export]", e);
    return NextResponse.json(
      { error: "导出请求异常" },
      { status: 500 }
    );
  }
}

/**
 * 异步执行 FFmpeg
 * 在生产环境应迁移到独立 Worker 进程
 */
async function processFFmpegAsync(
  jobId: string,
  args: string[],
  outputPath: string,
  credits: number,
  userId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>
) {
  try {
    await supabase
      .from("export_jobs")
      .update({ status: "processing", progress: 0 })
      .eq("id", jobId);

    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    proc.on("close", async (code) => {
      if (code === 0) {
        // 成功：上传到 R2（此处简化，直接记录路径）
        await supabase
          .from("export_jobs")
          .update({
            status: "completed",
            progress: 100,
            output_url: outputPath,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } else {
        await supabase
          .from("export_jobs")
          .update({
            status: "failed",
            error_message: `FFmpeg 退出码: ${code}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    });

    proc.on("error", async (err) => {
      await supabase
        .from("export_jobs")
        .update({
          status: "failed",
          error_message: err.message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    });
  } catch (e) {
    console.error("[FFmpeg Async]", e);
  }
}
