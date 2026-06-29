"use client";

import { useEditorStore } from "@/lib/editor/store";
import { secondsToPixels } from "@/lib/editor/time";

interface PlayheadProps {
  /** 是否作为叠加层渲染在轨道区域内 */
  isOverlay?: boolean;
}

export function Playhead({ isOverlay }: PlayheadProps) {
  const playhead = useEditorStore((s) => s.playhead);
  const zoom = useEditorStore((s) => s.timeline.zoom);

  const x = secondsToPixels(playhead, zoom);
  // 刻度尺区域有 36px 的偏移（轨道头的宽度 w-36 = 9rem = 144px）
  const leftOffset = isOverlay ? 144 : 0;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        left: x + leftOffset,
        width: 2,
        zIndex: 50,
      }}
    >
      {/* 线 */}
      <div className="absolute inset-0 bg-brand-gold" />
      {/* 顶部三角 */}
      {!isOverlay && (
        <div
          className="absolute -top-0 -left-[5px] w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "8px solid #FACC15",
          }}
        />
      )}
    </div>
  );
}
