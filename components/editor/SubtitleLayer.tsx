"use client";

import { useEditorStore } from "@/lib/editor/store";

interface SubtitleLayerProps {
  width: number;
  height: number;
  currentTime: number;
}

export function SubtitleLayer({ width, height, currentTime }: SubtitleLayerProps) {
  const subtitles = useEditorStore((s) => s.timeline.subtitles);

  // 找到当前时间应显示的字幕
  const activeSubtitle = subtitles.find(
    (sub) =>
      currentTime >= sub.startTime &&
      currentTime < sub.startTime + sub.duration
  );

  if (!activeSubtitle) return null;

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { top: "10%", left: "50%", transform: "translateX(-50%)" },
    center: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
    bottom: { bottom: "10%", left: "50%", transform: "translateX(-50%)" },
  };

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        zIndex: 20,
        ...positionStyles[activeSubtitle.style.position],
      }}
    >
      <div
        style={{
          fontSize: activeSubtitle.style.fontSize * (width / 640),
          color: activeSubtitle.style.color,
          backgroundColor: activeSubtitle.style.backgroundColor,
          padding: "4px 12px",
          borderRadius: "4px",
          whiteSpace: "nowrap",
          maxWidth: width * 0.8,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {activeSubtitle.text}
      </div>
    </div>
  );
}
