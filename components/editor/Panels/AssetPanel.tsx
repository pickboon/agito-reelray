"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useEditorStore } from "@/lib/editor/store";
import type { AssetItem } from "@/lib/editor/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Video, Plus, Clock } from "lucide-react";
import { formatTimeShort } from "@/lib/editor/time";

interface ShotData {
  id: string;
  shot_number: number;
  prompt: string;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: number;
}

export function AssetPanel() {
  const episodeId = useEditorStore((s) => s.episodeId);
  const addClipFromAsset = useEditorStore((s) => s.addClipFromAsset);
  const timeline = useEditorStore((s) => s.timeline);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssets() {
      if (!episodeId) return;

      const supabase = createClient();
      const { data: shots } = await supabase
        .from("shots")
        .select("id, shot_number, prompt, status, video_url, thumbnail_url, duration")
        .eq("episode_id", episodeId)
        .eq("status", "completed")
        .order("shot_number", { ascending: true });

      const items: AssetItem[] = ((shots ?? []) as ShotData[])
        .filter((s) => s.video_url)
        .map((s) => ({
          id: s.id,
          type: "video" as const,
          sourceType: "shot" as const,
          sourceUrl: s.video_url!,
          thumbnailUrl: s.thumbnail_url ?? undefined,
          duration: s.duration ?? 5,
          name: `Shot ${s.shot_number}`,
        }));

      setAssets(items);
      setLoading(false);
    }

    loadAssets();
  }, [episodeId]);

  const handleAddToTimeline = (asset: AssetItem) => {
    // 在最后一个片段之后添加
    const lastClip = timeline.clips.length > 0
      ? timeline.clips.reduce((last, c) =>
          c.startTime + c.duration > last.startTime + last.duration ? c : last
        )
      : null;

    const startTime = lastClip
      ? lastClip.startTime + lastClip.duration
      : 0;

    addClipFromAsset(asset, "video-1", startTime);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-brand-cyan flex items-center gap-1.5">
          <Video className="h-3.5 w-3.5" />
          素材库
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {assets.length} 个片段
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Video className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs text-center">暂无可用素材</p>
          <p className="text-[10px] text-center mt-1">
            在 Shot 页面生成视频后刷新
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {assets.map((asset) => {
            // 检查是否已在时间轴中
            const inTimeline = timeline.clips.some(
              (c) => c.sourceId === asset.id
            );

            return (
              <div
                key={asset.id}
                className={`flex items-center gap-2 p-2 rounded-md border transition-colors cursor-pointer ${
                  inTimeline
                    ? "border-brand-gold/20 bg-brand-gold/5"
                    : "border-border/50 hover:border-border hover:bg-white/[0.02]"
                }`}
                onClick={() => handleAddToTimeline(asset)}
              >
                {/* 缩略图 */}
                <div className="w-14 h-10 shrink-0 rounded bg-secondary/50 flex items-center justify-center overflow-hidden">
                  {asset.thumbnailUrl ? (
                    <Image
          src={asset.thumbnailUrl}
          alt={asset.name}
          fill
          className="w-full h-full object-cover"
        />
                  ) : (
                    <Video className="h-4 w-4 text-muted-foreground/50" />
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground truncate">
                    {asset.name}
                  </p>
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{formatTimeShort(asset.duration)}</span>
                  </div>
                </div>

                {/* 添加按钮 */}
                <button
                  className={`shrink-0 p-1 rounded transition-colors ${
                    inTimeline
                      ? "text-brand-gold bg-brand-gold/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  }`}
                  title={inTimeline ? "已在时间轴中" : "添加到时间轴"}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
