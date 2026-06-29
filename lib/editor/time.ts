/**
 * 时间工具：秒↔像素换算、吸附、格式化
 */

/** 最小时间精度（秒） */
export const TIME_PRECISION = 0.1;

/** 缩放范围（像素/秒） */
export const ZOOM_MIN = 20;
export const ZOOM_MAX = 200;
export const ZOOM_DEFAULT = 80;

/** 吸附阈值（像素） */
export const SNAP_THRESHOLD_PX = 8;

/** 最小片段时长（秒） */
export const MIN_CLIP_DURATION = 0.5;

/**
 * 秒转像素
 */
export function secondsToPixels(seconds: number, zoom: number): number {
  return seconds * zoom;
}

/**
 * 像素转秒（带精度吸附）
 */
export function pixelsToSeconds(pixels: number, zoom: number): number {
  return Math.round((pixels / zoom) / TIME_PRECISION) * TIME_PRECISION;
}

/**
 * 吸附到附近的吸附点
 * @param time 当前时间
 * @param snapPoints 吸附点列表（秒）
 * @param zoom 当前缩放级别
 * @returns 吸附后的时间
 */
export function snapToPoints(
  time: number,
  snapPoints: number[],
  zoom: number
): number {
  const threshold = SNAP_THRESHOLD_PX / zoom;
  let closest = time;
  let minDist = threshold;

  for (const point of snapPoints) {
    const dist = Math.abs(time - point);
    if (dist < minDist) {
      minDist = dist;
      closest = point;
    }
  }

  return closest;
}

/**
 * 限制时间范围
 */
export function clampTime(time: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, time));
}

/**
 * 格式化时间为 mm:ss.d
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secsInt = Math.floor(secs);
  const dec = Math.floor((secs - secsInt) * 10);

  if (mins > 0) {
    return `${mins}:${secsInt.toString().padStart(2, "0")}.${dec}`;
  }
  return `${secsInt}.${dec}s`;
}

/**
 * 格式化时间为 mm:ss
 */
export function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `0:${secs.toString().padStart(2, "0")}`;
}

/**
 * 计算刻度尺的刻度间隔
 * @param zoom 缩放级别
 * @returns [主刻度间隔(秒), 次刻度间隔(秒)]
 */
export function getRulerIntervals(zoom: number): [number, number] {
  if (zoom >= 150) return [1, 0.5];
  if (zoom >= 80) return [2, 1];
  if (zoom >= 40) return [5, 1];
  if (zoom >= 25) return [10, 5];
  return [30, 10];
}

/**
 * 收集时间轴上所有吸附点
 */
export function collectSnapPoints(
  clips: { startTime: number; duration: number }[],
  playhead: number,
  totalDuration: number
): number[] {
  const points = [0, playhead, totalDuration];
  for (const clip of clips) {
    points.push(clip.startTime);
    points.push(clip.startTime + clip.duration);
  }
  return points;
}
