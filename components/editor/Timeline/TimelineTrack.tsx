"use client";

import { useEditorStore } from "@/lib/editor/store";
import { TimelineClip } from "./TimelineClip";
import { secondsToPixels } from "@/lib/editor/time";
import type { Track } from "@/lib/editor/types";
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Trash2,
} from "lucide-react";

interface TimelineTrackProps {
  track: Track;
}

export function TimelineTrack({ track }: TimelineTrackProps) {
  const {
    timeline,
    toggleTrackLock,
    toggleTrackVisibility,
    toggleTrackMute,
    removeTrack,
    activeTrackId,
    setActiveTrack,
  } = useEditorStore();

  const clips = timeline.clips.filter((c) => c.trackId === track.id);
  const isActive = activeTrackId === track.id;

  return (
    <div className="flex border-b border-border/30 last:border-b-0">
      {/* 轨道头 */}
      <div
        className={`w-36 shrink-0 flex items-center gap-1 px-2 py-1.5 border-r border-border/50 cursor-pointer ${
          isActive ? "bg-brand-gold/5" : "hover:bg-white/[0.02]"
        }`}
        onClick={() => setActiveTrack(track.id)}
      >
        <span className="text-[11px] text-foreground/80 truncate flex-1">
          {track.name}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackVisibility(track.id);
            }}
            title={track.visible ? "隐藏轨道" : "显示轨道"}
          >
            {track.visible ? (
              <Eye className="h-3 w-3 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground/50" />
            )}
          </button>
          <button
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackLock(track.id);
            }}
            title={track.locked ? "解锁轨道" : "锁定轨道"}
          >
            {track.locked ? (
              <Lock className="h-3 w-3 text-brand-gold" />
            ) : (
              <Unlock className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {track.type === "audio" && (
            <button
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleTrackMute(track.id);
              }}
            >
              {track.muted ? (
                <VolumeX className="h-3 w-3 text-muted-foreground/50" />
              ) : (
                <Volume2 className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          )}
          {timeline.tracks.length > 1 && (
            <button
              className="p-0.5 rounded hover:bg-white/10 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                removeTrack(track.id);
              }}
              title="删除轨道"
            >
              <Trash2 className="h-3 w-3 text-muted-foreground/50" />
            </button>
          )}
        </div>
      </div>

      {/* 轨道内容区域 */}
      <div
        className="flex-1 relative min-h-[40px]"
        style={{ minWidth: 0 }}
      >
        {clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            zoom={timeline.zoom}
            trackLocked={track.locked}
          />
        ))}
      </div>
    </div>
  );
}
