/**
 * 关键帧插值引擎
 */

import type { Keyframe, EasingType } from "../types";

/**
 * 缓动函数
 */
function applyEasing(t: number, easing: EasingType): number {
  switch (easing) {
    case "linear":
      return t;
    case "ease-in":
      return t * t;
    case "ease-out":
      return 1 - (1 - t) * (1 - t);
    case "ease-in-out":
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

/**
 * 在关键帧数组中插值计算当前值
 * @param keyframes 关键帧数组（按 time 排序）
 * @param time 当前时间（相对片段开始）
 * @returns 插值后的数值
 */
export function interpolateKeyframes(keyframes: Keyframe[], time: number): number {
  if (keyframes.length === 0) return 1;
  if (keyframes.length === 1) return keyframes[0].value;

  // 排序保证
  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // 在第一个关键帧之前
  if (time <= sorted[0].time) return sorted[0].value;

  // 在最后一个关键帧之后
  if (time >= sorted[sorted.length - 1].time) return sorted[sorted.length - 1].value;

  // 找到所在的区间
  for (let i = 0; i < sorted.length - 1; i++) {
    const kf0 = sorted[i];
    const kf1 = sorted[i + 1];

    if (time >= kf0.time && time <= kf1.time) {
      const segmentDuration = kf1.time - kf0.time;
      if (segmentDuration === 0) return kf0.value;

      const t = (time - kf0.time) / segmentDuration;
      const easedT = applyEasing(t, kf1.easing);

      return kf0.value + (kf1.value - kf0.value) * easedT;
    }
  }

  return sorted[sorted.length - 1].value;
}
