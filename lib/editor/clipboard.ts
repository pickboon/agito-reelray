/**
 * 片段复制/粘贴工具
 */

import type { TimelineClip, SubtitleClip, ClipboardData } from "./types";

/**
 * 深拷贝片段（去除 id，以便粘贴时生成新 id）
 */
export function copyClips(clips: TimelineClip[]): Omit<TimelineClip, "id">[] {
  return clips.map(({ id, ...rest }) => ({ ...rest }));
}

/**
 * 深拷贝字幕
 */
export function copySubtitles(
  subs: SubtitleClip[]
): Omit<SubtitleClip, "id">[] {
  return subs.map(({ id, ...rest }) => ({ ...rest }));
}

/**
 * 构建剪贴板数据
 */
export function buildClipboardData(
  clips: TimelineClip[],
  subtitles: SubtitleClip[]
): ClipboardData {
  return {
    clips: copyClips(clips),
    subtitles: copySubtitles(subtitles),
  };
}

/**
 * 为粘贴的片段生成新 ID
 */
export function pasteClipData(
  data: Omit<TimelineClip, "id">,
  offsetSeconds: number = 0
): TimelineClip {
  return {
    ...data,
    id: crypto.randomUUID(),
    startTime: data.startTime + offsetSeconds,
  };
}

/**
 * 为粘贴的字幕生成新 ID
 */
export function pasteSubtitleData(
  data: Omit<SubtitleClip, "id">,
  offsetSeconds: number = 0
): SubtitleClip {
  return {
    ...data,
    id: crypto.randomUUID(),
    startTime: data.startTime + offsetSeconds,
  };
}
