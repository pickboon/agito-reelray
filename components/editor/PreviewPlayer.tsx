"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useEditorStore } from "@/lib/editor/store";
import { PlaybackEngine } from "@/lib/editor/playback-engine";
import type { PlaybackState } from "@/lib/editor/playback-engine";
import { interpolateKeyframes } from "@/lib/editor/effects/keyframes";
import { computeTransitionFrame } from "@/lib/editor/effects/transitions";
import { SubtitleLayer } from "./SubtitleLayer";
import { CanvasOverlay } from "./CanvasOverlay";

export function PreviewPlayer() {
  const { timeline, playhead, isPlaying, setPlayhead, setIsPlaying } =
    useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PlaybackEngine | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentClipId: null,
    nextClipId: null,
    inTransition: false,
    transitionProgress: 0,
    transform: { scale: 1, panX: 0, panY: 0 },
  });

  // 计算容器尺寸（保持 16:9）
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      // 保持 16:9
      const targetRatio = 16 / 9;
      const containerRatio = width / height;

      if (containerRatio > targetRatio) {
        setContainerSize({ width: height * targetRatio, height });
      } else {
        setContainerSize({ width, height: width / targetRatio });
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // 初始化播放引擎
  useEffect(() => {
    const engine = new PlaybackEngine(
      (state) => setPlaybackState(state),
      (time) => setPlayhead(time)
    );
    engineRef.current = engine;

    return () => {
      engine.destroy();
    };
  }, [setPlayhead]);

  // 播放/暂停控制
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    if (isPlaying) {
      engine.play(timeline, playhead);
    } else {
      engine.pause();
    }
  }, [isPlaying, timeline]);

  // Seek 同步（非播放时）
  const handleSeek = useCallback(
    (time: number) => {
      const engine = engineRef.current;
      if (!engine || isPlaying) return;
      engine.seek(timeline, time);
    },
    [timeline, isPlaying]
  );

  useEffect(() => {
    if (!isPlaying) {
      handleSeek(playhead);
    }
  }, [playhead, isPlaying, handleSeek]);

  // 计算当前片段和变换
  const currentClip = timeline.clips.find((c) => c.id === playbackState.currentClipId);
  const nextClip = timeline.clips.find((c) => c.id === playbackState.nextClipId);

  // 计算当前变换（非播放时直接从 playhead 计算）
  let currentTransform = { scale: 1, panX: 0, panY: 0 };
  if (!isPlaying && currentClip?.transform) {
    const localTime = playhead - currentClip.startTime;
    currentTransform = {
      scale: interpolateKeyframes(currentClip.transform.scale, localTime),
      panX: interpolateKeyframes(currentClip.transform.panX, localTime),
      panY: interpolateKeyframes(currentClip.transform.panY, localTime),
    };
  } else if (isPlaying) {
    currentTransform = playbackState.transform;
  }

  // 计算转场帧
  let transitionFrame = null;
  if (playbackState.inTransition && currentClip?.transitionOut) {
    const transitionStart =
      currentClip.startTime +
      currentClip.duration -
      currentClip.transitionOut.duration;
    const elapsed = playhead - transitionStart;
    transitionFrame = computeTransitionFrame(currentClip.transitionOut, elapsed);
  }

  const videoStyle = {
    transform: `scale(${currentTransform.scale}) translate(${currentTransform.panX}%, ${currentTransform.panY}%)`,
  };

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center">
      {containerSize.width > 0 && (
        <div
          className="relative bg-black rounded-sm overflow-hidden"
          style={{
            width: containerSize.width,
            height: containerSize.height,
          }}
        >
          {/* 视频层 */}
          {timeline.clips.map((clip) => {
            // 只显示当前片段和转场中的下一个片段
            const isCurrent = clip.id === playbackState.currentClipId;
            const isNext = clip.id === playbackState.nextClipId && playbackState.inTransition;

            if (!isCurrent && !isNext) return null;

            let opacity = 1;
            if (transitionFrame) {
              if (isCurrent) opacity = transitionFrame.outgoingOpacity;
              if (isNext) opacity = transitionFrame.incomingOpacity;
            }

            return (
              <video
                key={clip.id}
                ref={(el) => {
                  if (el) {
                    videoRefs.current.set(clip.id, el);
                    if (el.src !== clip.sourceUrl) {
                      el.src = clip.sourceUrl;
                      el.load();
                    }
                  }
                }}
                className="absolute inset-0 w-full h-full object-contain"
                style={{
                  ...videoStyle,
                  opacity,
                  zIndex: isCurrent ? 1 : 2,
                }}
                playsInline
                crossOrigin="anonymous"
              />
            );
          })}

          {/* Canvas 特效层 */}
          <CanvasOverlay
            width={containerSize.width}
            height={containerSize.height}
            transitionFrame={transitionFrame}
          />

          {/* 字幕层 */}
          <SubtitleLayer
            width={containerSize.width}
            height={containerSize.height}
            currentTime={playhead}
          />

          {/* 无片段时的占位 */}
          {timeline.clips.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground/50 text-sm">
                从素材面板拖入视频片段开始编辑
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
