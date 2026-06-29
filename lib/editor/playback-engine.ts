/**
 * 播放引擎
 * 管理视频元素池、同步 currentTime、驱动转场和关键帧动画
 */

import type { TimelineClip, EditorTimeline } from "./types";
import { interpolateKeyframes } from "./effects/keyframes";
import { computeTransitionFrame } from "./effects/transitions";

/** 视频元素池大小 */
const VIDEO_POOL_SIZE = 3;

export interface PlaybackState {
  /** 当前播放的视频片段 ID */
  currentClipId: string | null;
  /** 下一个预加载的视频片段 ID */
  nextClipId: string | null;
  /** 是否在转场期间 */
  inTransition: boolean;
  /** 转场进度 (0-1) */
  transitionProgress: number;
  /** 当前片段的关键帧变换 */
  transform: { scale: number; panX: number; panY: number };
}

export class PlaybackEngine {
  private videoPool: HTMLVideoElement[] = [];
  private clipVideoMap: Map<string, HTMLVideoElement> = new Map();
  private rafId: number | null = null;
  private lastTimestamp: number = 0;
  private state: PlaybackState = {
    currentClipId: null,
    nextClipId: null,
    inTransition: false,
    transitionProgress: 0,
    transform: { scale: 1, panX: 0, panY: 0 },
  };

  private onStateChange: (state: PlaybackState) => void;
  private onPlayheadUpdate: (time: number) => void;

  constructor(
    onStateChange: (state: PlaybackState) => void,
    onPlayheadUpdate: (time: number) => void
  ) {
    this.onStateChange = onStateChange;
    this.onPlayheadUpdate = onPlayheadUpdate;

    // 初始化视频元素池
    for (let i = 0; i < VIDEO_POOL_SIZE; i++) {
      const video = document.createElement("video");
      video.preload = "auto";
      video.playsInline = true;
      video.muted = false;
      video.crossOrigin = "anonymous";
      this.videoPool.push(video);
    }
  }

  /**
   * 获取当前播放状态
   */
  getState(): PlaybackState {
    return { ...this.state };
  }

  /**
   * 预加载片段
   */
  preloadClip(clip: TimelineClip): void {
    let video = this.clipVideoMap.get(clip.id);
    if (!video) {
      video = this.videoPool.find((v) => !v.src || v.src === "") ?? this.videoPool[0];
      video.src = clip.sourceUrl;
      video.load();
      this.clipVideoMap.set(clip.id, video);
    }
  }

  /**
   * 开始播放
   */
  play(timeline: EditorTimeline, startTime: number): void {
    this.lastTimestamp = performance.now();

    // 找到 startTime 对应的片段
    const clip = this.getClipAtTime(timeline, startTime);
    if (clip) {
      this.syncVideoToTime(clip, startTime);
    }

    // 预加载下一个片段
    const nextClip = this.getNextClip(timeline, clip, startTime);
    if (nextClip) {
      this.preloadClip(nextClip);
    }

    this.state.currentClipId = clip?.id ?? null;
    this.state.nextClipId = nextClip?.id ?? null;

    const tick = (now: number) => {
      const dt = (now - this.lastTimestamp) / 1000;
      this.lastTimestamp = now;

      const newTime = startTime + dt;
      startTime = newTime;

      // 检查是否超出总时长
      if (newTime >= timeline.totalDuration) {
        this.pause();
        this.onPlayheadUpdate(0);
        return;
      }

      // 更新当前片段
      const currentClip = this.getClipAtTime(timeline, newTime);
      if (currentClip && currentClip.id !== this.state.currentClipId) {
        this.state.currentClipId = currentClip.id;
        this.syncVideoToTime(currentClip, newTime);
        this.onStateChange({ ...this.state });
      }

      if (currentClip) {
        this.syncVideoToTime(currentClip, newTime);
        this.updateTransform(currentClip, newTime);
      }

      // 检查转场
      this.updateTransition(timeline, newTime);

      this.onPlayheadUpdate(newTime);
      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * 暂停
   */
  pause(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    for (const video of this.clipVideoMap.values()) {
      video.pause();
    }
  }

  /**
   * Seek 到指定时间
   */
  seek(timeline: EditorTimeline, time: number): void {
    const clip = this.getClipAtTime(timeline, time);

    if (clip) {
      this.state.currentClipId = clip.id;
      this.syncVideoToTime(clip, time);
      this.updateTransform(clip, time);

      const video = this.clipVideoMap.get(clip.id);
      if (video) {
        video.pause();
      }
    }

    this.updateTransition(timeline, time);
    this.onStateChange({ ...this.state });
  }

  /**
   * 清理资源
   */
  destroy(): void {
    this.pause();
    for (const video of this.videoPool) {
      video.src = "";
      video.load();
    }
    this.clipVideoMap.clear();
  }

  // ==================== 内部方法 ====================

  private getClipAtTime(
    timeline: EditorTimeline,
    time: number
  ): TimelineClip | null {
    return (
      timeline.clips.find(
        (c) => time >= c.startTime && time < c.startTime + c.duration
      ) ?? null
    );
  }

  private getNextClip(
    timeline: EditorTimeline,
    currentClip: TimelineClip | null,
    time: number
  ): TimelineClip | null {
    const sorted = [...timeline.clips].sort((a, b) => a.startTime - b.startTime);
    if (!currentClip) return sorted[0] ?? null;

    const idx = sorted.findIndex((c) => c.id === currentClip.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  }

  private syncVideoToTime(clip: TimelineClip, playheadTime: number): void {
    let video = this.clipVideoMap.get(clip.id);
    if (!video) {
      video =
        this.videoPool.find((v) => !v.src || v.src === "") ?? this.videoPool[0];
      video.src = clip.sourceUrl;
      video.load();
      this.clipVideoMap.set(clip.id, video);
    }

    const clipLocalTime = playheadTime - clip.startTime + clip.trimStart;
    if (Math.abs(video.currentTime - clipLocalTime) > 0.3) {
      video.currentTime = clipLocalTime;
    }
  }

  private updateTransform(clip: TimelineClip, time: number): void {
    if (!clip.transform) {
      this.state.transform = { scale: 1, panX: 0, panY: 0 };
      return;
    }

    const localTime = time - clip.startTime;
    this.state.transform = {
      scale: interpolateKeyframes(clip.transform.scale, localTime),
      panX: interpolateKeyframes(clip.transform.panX, localTime),
      panY: interpolateKeyframes(clip.transform.panY, localTime),
    };
  }

  private updateTransition(timeline: EditorTimeline, time: number): void {
    const sorted = [...timeline.clips].sort((a, b) => a.startTime - b.startTime);

    for (let i = 0; i < sorted.length - 1; i++) {
      const outgoing = sorted[i];
      const incoming = sorted[i + 1];

      if (!outgoing.transitionOut) continue;

      const transitionStart = outgoing.startTime + outgoing.duration - outgoing.transitionOut.duration;
      const transitionEnd = outgoing.startTime + outgoing.duration;

      if (time >= transitionStart && time < transitionEnd) {
        const elapsed = time - transitionStart;
        const frame = computeTransitionFrame(outgoing.transitionOut, elapsed);

        this.state.inTransition = true;
        this.state.transitionProgress = frame.progress;
        this.state.currentClipId = outgoing.id;
        this.state.nextClipId = incoming.id;

        // 同步两个视频
        this.syncVideoToTime(outgoing, time);
        this.syncVideoToTime(incoming, time);

        this.onStateChange({ ...this.state });
        return;
      }
    }

    if (this.state.inTransition) {
      this.state.inTransition = false;
      this.state.transitionProgress = 0;
      this.onStateChange({ ...this.state });
    }
  }
}
