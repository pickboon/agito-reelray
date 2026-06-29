"use client";

import { useRef, useCallback } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { secondsToPixels, getRulerIntervals, formatTimeShort } from "@/lib/editor/time";

export function TimelineRuler() {
  const { timeline, playhead, setPlayhead, setIsPlaying } = useEditorStore();
  const rulerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const { zoom, totalDuration } = timeline;
  const totalWidth = secondsToPixels(totalDuration, zoom);
  const [majorInterval, minorInterval] = getRulerIntervals(zoom);

  const handleSeek = useCallback(
    (clientX: number) => {
      const ruler = rulerRef.current;
      if (!ruler) return;

      const rect = ruler.getBoundingClientRect();
      const scrollLeft = ruler.parentElement?.scrollLeft ?? 0;
      const x = clientX - rect.left + scrollLeft;
      const time = Math.max(0, Math.min(x / zoom, totalDuration));
      setPlayhead(time);
    },
    [zoom, totalDuration, setPlayhead]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      setIsPlaying(false);
      handleSeek(e.clientX);

      const handleMove = (e: MouseEvent) => {
        if (dragging.current) handleSeek(e.clientX);
      };

      const handleUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [handleSeek, setIsPlaying]
  );

  // 生成刻度
  const ticks: { time: number; isMajor: boolean }[] = [];
  for (let t = 0; t <= totalDuration; t += minorInterval) {
    const rounded = Math.round(t * 100) / 100;
    const isMajor = Math.abs(rounded % majorInterval) < 0.01;
    ticks.push({ time: rounded, isMajor });
  }

  return (
    <div
      ref={rulerRef}
      className="h-full relative cursor-pointer select-none overflow-hidden"
      style={{ width: totalWidth }}
      onMouseDown={handleMouseDown}
    >
      {/* 刻度线 */}
      {ticks.map((tick) => {
        const x = secondsToPixels(tick.time, zoom);
        return (
          <div
            key={tick.time}
            className="absolute bottom-0"
            style={{
              left: x,
              width: 1,
              height: tick.isMajor ? "60%" : "35%",
              backgroundColor: tick.isMajor
                ? "rgba(255,255,255,0.3)"
                : "rgba(255,255,255,0.1)",
            }}
          />
        );
      })}

      {/* 主刻度标签 */}
      {ticks
        .filter((t) => t.isMajor)
        .map((tick) => {
          const x = secondsToPixels(tick.time, zoom);
          return (
            <span
              key={`label-${tick.time}`}
              className="absolute top-0.5 text-[9px] text-muted-foreground select-none"
              style={{ left: x + 3 }}
            >
              {formatTimeShort(tick.time)}
            </span>
          );
        })}
    </div>
  );
}
