"use client";

import { useEffect, useRef } from "react";
import type { TransitionFrame } from "@/lib/editor/effects/transitions";

interface CanvasOverlayProps {
  width: number;
  height: number;
  transitionFrame: TransitionFrame | null;
}

export function CanvasOverlay({ width, height, transitionFrame }: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 渲染 wipe 转场遮罩
    if (transitionFrame?.wipePercent !== undefined) {
      const wipePx = (transitionFrame.wipePercent / 100) * width;

      ctx.fillStyle = "rgba(0, 0, 0, 0.8)";

      // wipe-left: 遮罩从左到右
      if (transitionFrame.progress < 0.5) {
        ctx.fillRect(0, 0, wipePx, height);
      } else {
        ctx.fillRect(width - wipePx, 0, wipePx, height);
      }
    }
  }, [width, height, transitionFrame]);

  if (!transitionFrame?.wipePercent) return null;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}
