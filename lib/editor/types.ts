/**
 * 编辑器核心类型定义
 */

// ==================== 关键帧 ====================

export type EasingType = "linear" | "ease-in" | "ease-out" | "ease-in-out";

export interface Keyframe {
  /** 相对片段开始的时间（秒） */
  time: number;
  value: number;
  easing: EasingType;
}

export interface ClipTransform {
  /** 缩放关键帧，1.0 = 原始大小 */
  scale: Keyframe[];
  /** 水平平移关键帧，-100 到 100（百分比偏移） */
  panX: Keyframe[];
  /** 垂直平移关键帧，-100 到 100（百分比偏移） */
  panY: Keyframe[];
}

// ==================== 转场 ====================

export type TransitionType = "fade" | "dissolve" | "wipe-left" | "wipe-right";

export interface TransitionConfig {
  type: TransitionType;
  /** 转场时长（秒），默认 0.5 */
  duration: number;
}

// ==================== 片段 ====================

export type ClipType = "video" | "audio" | "subtitle";

export interface TimelineClip {
  id: string;
  type: "video";
  /** 来源 ID（shot.id 或 generation_task.id） */
  sourceId: string;
  /** 视频 URL */
  sourceUrl: string;
  /** 缩略图 URL */
  thumbnailUrl?: string;
  /** 时间轴上的位置（秒） */
  startTime: number;
  /** 片段截取起点（秒，相对源视频） */
  trimStart: number;
  /** 片段截取终点（秒，相对源视频） */
  trimEnd: number;
  /** 源视频总时长（秒） */
  sourceDuration: number;
  /** 显示时长 = trimEnd - trimStart */
  duration: number;
  /** 所属轨道 ID */
  trackId: string;
  /** 关键帧动画 */
  transform?: ClipTransform;
  /** 入转场 */
  transitionIn?: TransitionConfig;
  /** 出转场 */
  transitionOut?: TransitionConfig;
  /** 音量 0-1 */
  volume: number;
  /** 片段名称（显示用） */
  name: string;
}

// ==================== 音频轨道 ====================

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  /** 时间轴上的起始位置（秒） */
  startTime: number;
  /** 音量 0-1 */
  volume: number;
  /** 淡入时长（秒） */
  fadeIn: number;
  /** 淡出时长（秒） */
  fadeOut: number;
  /** 是否循环 */
  loop: boolean;
  /** 音频总时长（秒） */
  duration: number;
}

// ==================== 字幕 ====================

export type SubtitlePosition = "top" | "center" | "bottom";

export interface SubtitleStyle {
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: SubtitlePosition;
}

export interface SubtitleClip {
  id: string;
  text: string;
  startTime: number;
  duration: number;
  style: SubtitleStyle;
}

// ==================== 轨道 ====================

export type TrackType = "video" | "audio" | "subtitle";

export interface Track {
  id: string;
  type: TrackType;
  name: string;
  /** 轨道是否锁定（锁定后不可编辑） */
  locked: boolean;
  /** 轨道是否可见 */
  visible: boolean;
  /** 轨道是否静音（仅音频） */
  muted: boolean;
}

// ==================== 时间轴 ====================

export interface EditorTimeline {
  tracks: Track[];
  clips: TimelineClip[];
  audioTracks: AudioTrack[];
  subtitles: SubtitleClip[];
  /** 总时长（秒） */
  totalDuration: number;
  /** 缩放级别（像素/秒） */
  zoom: number;
}

// ==================== 编辑器状态 ====================

export interface EditorState {
  /** 当前 episode ID */
  episodeId: string | null;
  /** 项目名称 */
  projectName: string;
  /** 时间轴数据 */
  timeline: EditorTimeline;
  /** 播放头位置（秒） */
  playhead: number;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 选中的片段 ID 集合 */
  selectedClipIds: Set<string>;
  /** 选中的轨道 ID */
  activeTrackId: string | null;
  /** 面板状态 */
  panels: {
    assetsOpen: boolean;
    propertiesOpen: boolean;
  };
  /** 是否已修改（未保存） */
  isDirty: boolean;
  /** 剪贴板 */
  clipboard: ClipboardData | null;
}

// ==================== 剪贴板 ====================

export interface ClipboardData {
  clips: Omit<TimelineClip, "id">[];
  subtitles: Omit<SubtitleClip, "id">[];
}

// ==================== 可用素材（从 shots 导入） ====================

export interface AssetItem {
  id: string;
  type: "video";
  sourceType: "shot" | "generation_task";
  sourceUrl: string;
  thumbnailUrl?: string;
  duration: number;
  name: string;
}

// ==================== 导出 ====================

export type ExportStatus = "pending" | "processing" | "completed" | "failed";

export interface ExportJob {
  id: string;
  status: ExportStatus;
  progress: number;
  outputUrl?: string;
  creditsConsumed: number;
  errorMessage?: string;
}

// ==================== 默认值工厂 ====================

export function createDefaultTimeline(): EditorTimeline {
  return {
    tracks: [
      {
        id: "video-1",
        type: "video",
        name: "视频 1",
        locked: false,
        visible: true,
        muted: false,
      },
    ],
    clips: [],
    audioTracks: [],
    subtitles: [],
    totalDuration: 60,
    zoom: 80,
  };
}

export function createDefaultSubtitleStyle(): SubtitleStyle {
  return {
    fontSize: 24,
    color: "#ffffff",
    backgroundColor: "rgba(0,0,0,0.6)",
    position: "bottom",
  };
}

export function createDefaultTransform(): ClipTransform {
  return {
    scale: [{ time: 0, value: 1, easing: "linear" }],
    panX: [{ time: 0, value: 0, easing: "linear" }],
    panY: [{ time: 0, value: 0, easing: "linear" }],
  };
}
