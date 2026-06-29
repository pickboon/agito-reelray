/**
 * 编辑器 Zustand Store
 * 集成 temporal middleware 实现撤销/重做
 */

import { create } from "zustand";
import { temporal } from "zundo";
import type {
  EditorState,
  EditorTimeline,
  TimelineClip,
  SubtitleClip,
  AudioTrack,
  Track,
  AssetItem,
  ClipboardData,
} from "./types";
import { createDefaultTimeline, createDefaultSubtitleStyle } from "./types";
import { buildClipboardData, pasteClipData, pasteSubtitleData } from "./clipboard";
import { MIN_CLIP_DURATION } from "./time";

interface EditorActions {
  // 初始化
  init: (episodeId: string, projectName: string, timeline?: EditorTimeline) => void;
  reset: () => void;

  // 时间轴
  setTimeline: (timeline: EditorTimeline) => void;
  setZoom: (zoom: number) => void;
  setTotalDuration: (duration: number) => void;

  // 播放
  setPlayhead: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;

  // 片段操作
  addClipFromAsset: (asset: AssetItem, trackId: string, startTime: number) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  deleteClips: (clipIds: string[]) => void;
  moveClip: (clipId: string, newStartTime: number, newTrackId?: string) => void;
  trimClipStart: (clipId: string, newTrimStart: number) => void;
  trimClipEnd: (clipId: string, newTrimEnd: number) => void;
  splitClipAtPlayhead: () => void;

  // 选择
  selectClip: (clipId: string, multi: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // 剪贴板
  copySelection: () => void;
  pasteAtPlayhead: () => void;

  // 字幕
  addSubtitle: (text: string, startTime: number, duration: number) => void;
  updateSubtitle: (id: string, updates: Partial<SubtitleClip>) => void;
  deleteSubtitle: (id: string) => void;

  // 音频
  addAudioTrack: (track: AudioTrack) => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  deleteAudioTrack: (id: string) => void;

  // 轨道
  addTrack: (type: "video" | "audio") => void;
  removeTrack: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  setActiveTrack: (trackId: string | null) => void;

  // 面板
  toggleAssetsPanel: () => void;
  togglePropertiesPanel: () => void;

  // 脏标记
  setDirty: (dirty: boolean) => void;
}

export type EditorStore = EditorState & EditorActions;

const initialState: EditorState = {
  episodeId: null,
  projectName: "",
  timeline: createDefaultTimeline(),
  playhead: 0,
  isPlaying: false,
  selectedClipIds: new Set(),
  activeTrackId: null,
  panels: {
    assetsOpen: true,
    propertiesOpen: true,
  },
  isDirty: false,
  clipboard: null,
};

export const useEditorStore = create<EditorStore>()(
  temporal(
    (set, get) => ({
      ...initialState,

      // ==================== 初始化 ====================

      init: (episodeId, projectName, timeline) =>
        set({
          episodeId,
          projectName,
          timeline: timeline ?? createDefaultTimeline(),
          playhead: 0,
          isPlaying: false,
          selectedClipIds: new Set(),
          activeTrackId: null,
          isDirty: false,
          clipboard: null,
        }),

      reset: () => set(initialState),

      // ==================== 时间轴 ====================

      setTimeline: (timeline) => set({ timeline, isDirty: true }),

      setZoom: (zoom) =>
        set((s) => ({
          timeline: { ...s.timeline, zoom: Math.max(20, Math.min(200, zoom)) },
        })),

      setTotalDuration: (duration) =>
        set((s) => ({
          timeline: { ...s.timeline, totalDuration: duration },
          isDirty: true,
        })),

      // ==================== 播放 ====================

      setPlayhead: (time) =>
        set({ playhead: Math.max(0, time) }),

      setIsPlaying: (playing) => set({ isPlaying: playing }),

      // ==================== 片段操作 ====================

      addClipFromAsset: (asset, trackId, startTime) => {
        const clip: TimelineClip = {
          id: crypto.randomUUID(),
          type: "video",
          sourceId: asset.id,
          sourceUrl: asset.sourceUrl,
          thumbnailUrl: asset.thumbnailUrl,
          startTime,
          trimStart: 0,
          trimEnd: asset.duration,
          sourceDuration: asset.duration,
          duration: asset.duration,
          trackId,
          volume: 1,
          name: asset.name,
        };

        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: [...s.timeline.clips, clip],
            totalDuration: Math.max(
              s.timeline.totalDuration,
              startTime + asset.duration + 10
            ),
          },
          isDirty: true,
        }));
      },

      updateClip: (clipId, updates) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: s.timeline.clips.map((c) =>
              c.id === clipId ? { ...c, ...updates } : c
            ),
          },
          isDirty: true,
        })),

      deleteClips: (clipIds) => {
        const ids = new Set(clipIds);
        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: s.timeline.clips.filter((c) => !ids.has(c.id)),
          },
          selectedClipIds: new Set(
            [...s.selectedClipIds].filter((id) => !ids.has(id))
          ),
          isDirty: true,
        }));
      },

      moveClip: (clipId, newStartTime, newTrackId) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: s.timeline.clips.map((c) =>
              c.id === clipId
                ? {
                    ...c,
                    startTime: Math.max(0, newStartTime),
                    ...(newTrackId ? { trackId: newTrackId } : {}),
                  }
                : c
            ),
          },
          isDirty: true,
        })),

      trimClipStart: (clipId, newTrimStart) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: s.timeline.clips.map((c) => {
              if (c.id !== clipId) return c;
              const trimStart = Math.max(0, Math.min(newTrimStart, c.trimEnd - MIN_CLIP_DURATION));
              return {
                ...c,
                trimStart,
                duration: c.trimEnd - trimStart,
                startTime: c.startTime + (trimStart - c.trimStart),
              };
            }),
          },
          isDirty: true,
        })),

      trimClipEnd: (clipId, newTrimEnd) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: s.timeline.clips.map((c) => {
              if (c.id !== clipId) return c;
              const trimEnd = Math.min(
                c.sourceDuration,
                Math.max(newTrimEnd, c.trimStart + MIN_CLIP_DURATION)
              );
              return {
                ...c,
                trimEnd,
                duration: trimEnd - c.trimStart,
              };
            }),
          },
          isDirty: true,
        })),

      splitClipAtPlayhead: () => {
        const { timeline, playhead } = get();
        const clip = timeline.clips.find(
          (c) =>
            c.type === "video" &&
            playhead > c.startTime &&
            playhead < c.startTime + c.duration
        );

        if (!clip) return;

        const splitOffset = playhead - clip.startTime;
        const clipA: TimelineClip = {
          ...clip,
          trimEnd: clip.trimStart + splitOffset,
          duration: splitOffset,
        };
        const clipB: TimelineClip = {
          ...clip,
          id: crypto.randomUUID(),
          startTime: playhead,
          trimStart: clip.trimStart + splitOffset,
          duration: clip.duration - splitOffset,
          transitionIn: undefined,
        };
        clipA.transitionOut = undefined;

        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: s.timeline.clips.map((c) => (c.id === clip.id ? clipA : c)).concat(clipB),
          },
          isDirty: true,
        }));
      },

      // ==================== 选择 ====================

      selectClip: (clipId, multi) =>
        set((s) => {
          if (multi) {
            const next = new Set(s.selectedClipIds);
            if (next.has(clipId)) next.delete(clipId);
            else next.add(clipId);
            return { selectedClipIds: next };
          }
          return { selectedClipIds: new Set([clipId]) };
        }),

      selectAll: () =>
        set((s) => ({
          selectedClipIds: new Set(s.timeline.clips.map((c) => c.id)),
        })),

      clearSelection: () => set({ selectedClipIds: new Set() }),

      // ==================== 剪贴板 ====================

      copySelection: () => {
        const { timeline, selectedClipIds } = get();
        const selectedClips = timeline.clips.filter((c) => selectedClipIds.has(c.id));
        const data = buildClipboardData(selectedClips, []);
        set({ clipboard: data });
      },

      pasteAtPlayhead: () => {
        const { clipboard, playhead, timeline } = get();
        if (!clipboard || clipboard.clips.length === 0) return;

        // 计算粘贴偏移：相对原始第一个片段的时间差
        const minStart = Math.min(...clipboard.clips.map((c) => c.startTime));
        const offset = playhead - minStart;

        const newClips = clipboard.clips.map((data) => pasteClipData(data, offset));

        set((s) => ({
          timeline: {
            ...s.timeline,
            clips: [...s.timeline.clips, ...newClips],
          },
          selectedClipIds: new Set(newClips.map((c) => c.id)),
          isDirty: true,
        }));
      },

      // ==================== 字幕 ====================

      addSubtitle: (text, startTime, duration) => {
        const sub: SubtitleClip = {
          id: crypto.randomUUID(),
          text,
          startTime,
          duration,
          style: createDefaultSubtitleStyle(),
        };
        set((s) => ({
          timeline: {
            ...s.timeline,
            subtitles: [...s.timeline.subtitles, sub],
          },
          isDirty: true,
        }));
      },

      updateSubtitle: (id, updates) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            subtitles: s.timeline.subtitles.map((sub) =>
              sub.id === id ? { ...sub, ...updates } : sub
            ),
          },
          isDirty: true,
        })),

      deleteSubtitle: (id) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            subtitles: s.timeline.subtitles.filter((sub) => sub.id !== id),
          },
          isDirty: true,
        })),

      // ==================== 音频 ====================

      addAudioTrack: (track) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            audioTracks: [...s.timeline.audioTracks, track],
          },
          isDirty: true,
        })),

      updateAudioTrack: (id, updates) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            audioTracks: s.timeline.audioTracks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          },
          isDirty: true,
        })),

      deleteAudioTrack: (id) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            audioTracks: s.timeline.audioTracks.filter((t) => t.id !== id),
          },
          isDirty: true,
        })),

      // ==================== 轨道 ====================

      addTrack: (type) => {
        const existingCount = get().timeline.tracks.filter((t) => t.type === type).length;
        const track: Track = {
          id: `${type}-${existingCount + 1}-${crypto.randomUUID().slice(0, 6)}`,
          type,
          name: type === "video" ? `视频 ${existingCount + 1}` : `音频 ${existingCount + 1}`,
          locked: false,
          visible: true,
          muted: false,
        };

        set((s) => ({
          timeline: {
            ...s.timeline,
            tracks: [...s.timeline.tracks, track],
          },
          isDirty: true,
        }));
      },

      removeTrack: (trackId) => {
        const track = get().timeline.tracks.find((t) => t.id === trackId);
        if (!track) return;

        set((s) => ({
          timeline: {
            ...s.timeline,
            tracks: s.timeline.tracks.filter((t) => t.id !== trackId),
            clips: s.timeline.clips.filter((c) => c.trackId !== trackId),
          },
          isDirty: true,
        }));
      },

      toggleTrackLock: (trackId) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            tracks: s.timeline.tracks.map((t) =>
              t.id === trackId ? { ...t, locked: !t.locked } : t
            ),
          },
        })),

      toggleTrackVisibility: (trackId) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            tracks: s.timeline.tracks.map((t) =>
              t.id === trackId ? { ...t, visible: !t.visible } : t
            ),
          },
        })),

      toggleTrackMute: (trackId) =>
        set((s) => ({
          timeline: {
            ...s.timeline,
            tracks: s.timeline.tracks.map((t) =>
              t.id === trackId ? { ...t, muted: !t.muted } : t
            ),
          },
        })),

      setActiveTrack: (trackId) => set({ activeTrackId: trackId }),

      // ==================== 面板 ====================

      toggleAssetsPanel: () =>
        set((s) => ({
          panels: { ...s.panels, assetsOpen: !s.panels.assetsOpen },
        })),

      togglePropertiesPanel: () =>
        set((s) => ({
          panels: { ...s.panels, propertiesOpen: !s.panels.propertiesOpen },
        })),

      // ==================== 脏标记 ====================

      setDirty: (dirty) => set({ isDirty: dirty }),
    }),
    {
      // temporal middleware 配置
      limit: 50,
      partialize: (state) => {
        // 只对时间轴数据做撤销/重做，排除播放状态
        const { timeline, selectedClipIds, isDirty } = state;
        return { timeline, selectedClipIds, isDirty } as unknown as EditorState;
      },
      equality: (pastState, currentState) =>
        pastState.timeline === currentState.timeline,
    }
  )
);

// 导出供快捷键使用的 hooks
export const useUndo = () => useEditorStore.temporal.getState().undo;
export const useRedo = () => useEditorStore.temporal.getState().redo;
