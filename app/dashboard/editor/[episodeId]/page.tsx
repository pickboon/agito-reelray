"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useEditorStore } from "@/lib/editor/store";
import { EditorShell } from "@/components/editor/EditorShell";
import { Skeleton } from "@/components/ui/skeleton";
import type { EditorTimeline, AssetItem, TimelineClip } from "@/lib/editor/types";
import { createDefaultTimeline } from "@/lib/editor/types";

interface Episode {
  id: string;
  title: string;
  project_id: string;
}

interface Shot {
  id: string;
  shot_number: number;
  prompt: string;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number;
}

export default function EditorPage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const init = useEditorStore((s) => s.init);

  useEffect(() => {
    async function loadEditor() {
      try {
        const supabase = createClient();

        // 加载 episode 信息
        const { data: episode, error: epError } = await supabase
          .from("episodes")
          .select("id, title, project_id")
          .eq("id", episodeId)
          .single();

        if (epError || !episode) {
          setError("集不存在或无权访问");
          setLoading(false);
          return;
        }

        const ep = episode as Episode;

        // 加载该 episode 的所有已完成 shots
        const { data: shots } = await supabase
          .from("shots")
          .select("id, shot_number, prompt, status, video_url, thumbnail_url, duration")
          .eq("episode_id", episodeId)
          .eq("status", "completed")
          .order("shot_number", { ascending: true });

        // 尝试加载已保存的时间轴状态
        const { data: savedTimeline } = await supabase
          .from("editor_timelines")
          .select("state")
          .eq("episode_id", episodeId)
          .maybeSingle();

        let timeline: EditorTimeline;

        if (savedTimeline?.state && typeof savedTimeline.state === "object") {
          timeline = deserializeTimeline(savedTimeline.state as Record<string, unknown>);
        } else {
          timeline = buildInitialTimeline((shots ?? []) as Shot[]);
        }

        init(episodeId, ep.title, timeline);
      } catch (err) {
        console.error("[Editor] loadEditor error:", err);
        setError("加载编辑器失败: " + (err instanceof Error ? err.message : "未知错误"));
      } finally {
        setLoading(false);
      }
    }

    loadEditor();
  }, [episodeId, init]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return <EditorShell />;
}

// ==================== 辅助函数 ====================

function buildInitialTimeline(shots: Shot[]): EditorTimeline {
  const timeline = createDefaultTimeline();

  let currentTime = 0;
  const clips: TimelineClip[] = [];

  for (const shot of shots) {
    if (!shot.video_url) continue;

    const duration = shot.duration ?? 5;
    clips.push({
      id: crypto.randomUUID(),
      type: "video",
      sourceId: shot.id,
      sourceUrl: shot.video_url,
      thumbnailUrl: shot.thumbnail_url ?? undefined,
      startTime: currentTime,
      trimStart: 0,
      trimEnd: duration,
      sourceDuration: duration,
      duration,
      trackId: "video-1",
      volume: 1,
      name: `Shot ${shot.shot_number}: ${shot.prompt.slice(0, 30)}`,
    });

    currentTime += duration;
  }

  timeline.clips = clips;
  timeline.totalDuration = Math.max(60, currentTime + 10);

  return timeline;
}

function deserializeTimeline(raw: Record<string, unknown>): EditorTimeline {
  // JSON 中的 Set 会被序列化为普通对象，这里做反序列化
  const tl = raw as unknown as EditorTimeline;
  return {
    tracks: tl.tracks ?? createDefaultTimeline().tracks,
    clips: tl.clips ?? [],
    audioTracks: tl.audioTracks ?? [],
    subtitles: tl.subtitles ?? [],
    totalDuration: tl.totalDuration ?? 60,
    zoom: tl.zoom ?? 80,
  };
}
