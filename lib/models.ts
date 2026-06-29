export interface VideoModel {
  id: string;
  name: string;
  description: string;
  available: boolean;
  badge?: string;
}

export const VIDEO_MODELS: VideoModel[] = [
  {
    id: "happyhorse-1.1",
    name: "HappyHorse 1.1",
    description: "高质量视频生成，支持文生视频和图生视频",
    available: true,
  },
  {
    id: "kling-3.0",
    name: "Kling 3.0",
    description: "快手可灵大模型",
    available: false,
    badge: "即将推出",
  },
  {
    id: "wan-2.5",
    name: "Wan 2.5",
    description: "万象视频生成模型",
    available: false,
    badge: "即将推出",
  },
];

export const RESOLUTIONS = [
  { value: "720p", label: "720P", description: "标准画质" },
  { value: "1080p", label: "1080P", description: "高清画质" },
] as const;

export const DURATIONS = [
  { value: 5, label: "5秒" },
  { value: 10, label: "10秒" },
  { value: 15, label: "15秒" },
] as const;

export const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", description: "横屏" },
  { value: "9:16", label: "9:16", description: "竖屏" },
  { value: "1:1", label: "1:1", description: "方形" },
] as const;

export const LENS_OPTIONS = [
  { value: "fixed", label: "固定", description: "镜头不移动" },
  { value: "zoom-in", label: "推进", description: "镜头向前推进" },
  { value: "zoom-out", label: "拉远", description: "镜头向后拉远" },
  { value: "pan", label: "横移", description: "镜头水平移动" },
] as const;

export type Resolution = typeof RESOLUTIONS[number]["value"];
export type AspectRatio = typeof ASPECT_RATIOS[number]["value"];
