"use client";

import { useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { secondsToPixels, pixelsToSeconds, snapToPoints, collectSnapPoints } from "@/lib/editor/time";
import type { TimelineClip as ClipType } from "@/lib/editor/types";

interface TimelineClipProps {
  clip: ClipType;
  zoom: number;
  trackLocked: boolean;
}

export function TimelineClip({ clip, zoom, trackLocked }: TimelineClipProps) {
  const {
    timeline,
    selectClip,
    selectedClipIds,
    moveClip,
    trimClipStart,
    trimClipEnd,
    playhead,
  } = useEditorStore();

  const clipRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    mode: "move" | "trim-left" | "trim-right";
    startX: number;
    originalStartTime: number;
    originalTrimStart: number;
    originalTrimEnd: number;
  } | null>(null);

  const isSelected = selectedClipIds.has(clip.id);
  const left = secondsToPixels(clip.startTime, zoom);
  const width = secondsToPixels(clip.duration, zoom);

  // 生成缩略图序列
  const thumbnailCount = Math.max(1, Math.floor(width / 48));
  const thumbWidth = width / thumbnailCount;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (trackLocked) return;
      e.stopPropagation();
      e.preventDefault();

      selectClip(clip.id, e.shiftKey || e.metaKey);

      const rect = clipRef.current?.getBoundingClientRect();
      if (!rect) return;

      const edgeThreshold = 6;
      const relX = e.clientX - rect.left;

      let mode: "move" | "trim-left" | "trim-right";
      if (relX < edgeThreshold) {
        mode = "trim-left";
      } else if (relX > width - edgeThreshold) {
        mode = "trim-right";
      } else {
        mode = "move";
      }

      dragState.current = {
        mode,
        startX: e.clientX,
        originalStartTime: clip.startTime,
        originalTrimStart: clip.trimStart,
        originalTrimEnd: clip.trimEnd,
      };

      const snapPoints = collectSnapPoints(
        timeline.clips.filter((c) => c.id !== clip.id),
        playhead,
        timeline.totalDuration
      );

      const handleMove = (e: MouseEvent) => {
        if (!dragState.current) return;

        const dx = e.clientX - dragState.current.startX;
        const dt = pixelsToSeconds(dx, zoom);

        switch (dragState.current.mode) {
          case "move": {
            const newStart = snapToPoints(
              dragState.current.originalStartTime + dt,
              snapPoints,
              zoom
            );
            moveClip(clip.id, Math.max(0, newStart));
            break;
          }
          case "trim-left": {
            const newTrimStart = dragState.current.originalTrimStart + dt;
            trimClipStart(clip.id, newTrimStart);
            break;
          }
          case "trim-right": {
            const newTrimEnd = dragState.current.originalTrimEnd + dt;
            trimClipEnd(clip.id, newTrimEnd);
            break;
          }
        }
      };

      const handleUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [
      clip,
      zoom,
      width,
      trackLocked,
      timeline,
      playhead,
      selectClip,
      moveClip,
      trimClipStart,
      trimClipEnd,
    ]
  );

  const getCursor = () => {
    if (trackLocked) return "not-allowed";
    return "grab";
  };

  return (
    <div
      ref={clipRef}
      className={`absolute top-1 bottom-1 rounded-md overflow-hidden select-none group ${
        isSelected
          ? "ring-1 ring-brand-gold shadow-[0_0_8px_rgba(250,204,21,0.3)]"
          : "hover:ring-1 hover:ring-brand-gold/40"
      } ${trackLocked ? "opacity-60" : ""}`}
      style={{
        left,
        width,
        cursor: getCursor(),
        minWidth: 20,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 背景渐变 */}
      <div
        className="absolute inset-0"
        style={{
          background: clip.type === "video"
            ? "linear-gradient(135deg, rgba(0, 240, 255, 0.15), rgba(0, 240, 255, 0.05))"
            : "linear-gradient(135deg, rgba(250, 204, 21, 0.15), rgba(250, 204, 21, 0.05))",
          borderLeft: "2px solid rgba(0, 240, 255, 0.6)",
          borderRight: "2px solid rgba(0, 240, 255, 0.6)",
          borderTop: "1px solid rgba(0, 240, 255, 0.3)",
          borderBottom: "1px solid rgba(0, 240, 255, 0.3)",
        }}
      />

      {/* 缩略图序列 */}
      {clip.thumbnailUrl && (
        <div className="absolute inset-0 flex opacity-40 group-hover:opacity-60 transition-opacity">
          {Array.from({ length: thumbnailCount }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 bg-cover bg-center"
              style={{
                width: thumbWidth,
                backgroundImage: `url(${clip.thumbnailUrl})`,
                backgroundPosition: `${((clip.trimStart + (clip.duration / thumbnailCount) * i) / clip.sourceDuration) * 100}% center`,
              }}
            />
          ))}
        </div>
      )}

      {/* 片段名称 */}
      <div className="absolute inset-x-0 top-0 px-1.5 py-0.5 z-10">
        <span className="text-[9px] text-white/80 truncate block drop-shadow-sm">
          {clip.name}
        </span>
      </div>

      {/* 左截取手柄 */}
      {!trackLocked && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:bg-brand-gold/50 transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}

      {/* 右截取手柄 */}
      {!trackLocked && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 hover:bg-brand-gold/50 transition-colors"
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}

      {/* 转场标记 */}
      {clip.transitionIn && (
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-brand-gold/20 flex items-center justify-center">
          <span className="text-[8px] text-brand-gold">▶</span>
        </div>
      )}
      {clip.transitionOut && (
        <div className="absolute right-0 top-0 bottom-0 w-3 bg-brand-gold/20 flex items-center justify-center">
          <span className="text-[8px] text-brand-gold">◀</span>
        </div>
      )}
    </div>
  );
}
