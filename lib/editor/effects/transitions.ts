/**
 * 转场效果实现
 * 提供 CSS transform / opacity 值供预览层使用
 * 以及 FFmpeg filter 字符串供导出使用
 */

import type { TransitionType, TransitionConfig } from "../types";

export interface TransitionFrame {
  /** 进度 0→1 */
  progress: number;
  /** 出片段不透明度 */
  outgoingOpacity: number;
  /** 入片段不透明度 */
  incomingOpacity: number;
  /** 出片段 CSS transform */
  outgoingTransform: string;
  /** 入片段 CSS transform */
  incomingTransform: string;
  /** wipe 遮罩百分比（0-100），仅 wipe 类型 */
  wipePercent?: number;
}

/**
 * 计算转场帧
 */
export function computeTransitionFrame(
  config: TransitionConfig,
  elapsed: number
): TransitionFrame {
  const progress = Math.max(0, Math.min(1, elapsed / config.duration));

  switch (config.type) {
    case "fade":
      return {
        progress,
        outgoingOpacity: 1 - progress,
        incomingOpacity: progress,
        outgoingTransform: "none",
        incomingTransform: "none",
      };

    case "dissolve":
      return {
        progress,
        outgoingOpacity: 1,
        incomingOpacity: progress,
        outgoingTransform: "none",
        incomingTransform: "none",
      };

    case "wipe-left":
      return {
        progress,
        outgoingOpacity: 1,
        incomingOpacity: 1,
        outgoingTransform: "none",
        incomingTransform: "none",
        wipePercent: progress * 100,
      };

    case "wipe-right":
      return {
        progress,
        outgoingOpacity: 1,
        incomingOpacity: 1,
        outgoingTransform: "none",
        incomingTransform: "none",
        wipePercent: (1 - progress) * 100,
      };
  }
}

/**
 * 生成 FFmpeg xfade filter 参数
 */
export function toFFmpegTransition(
  config: TransitionConfig
): { transition: string; duration: number } {
  const map: Record<TransitionType, string> = {
    fade: "fade",
    dissolve: "dissolve",
    "wipe-left": "wipeleft",
    "wipe-right": "wiperight",
  };

  return {
    transition: map[config.type],
    duration: config.duration,
  };
}
