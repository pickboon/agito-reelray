export interface ModelCapabilities {
  t2v: boolean;
  r2v: boolean;
  maxDuration: number;
  supportedAspectRatios: string[];
  maxReferenceImages: number;
  nativeAudio: boolean;
  lipSyncLanguages: string[];
}

export interface GenerateParams {
  prompt: string;
  mode: "t2v" | "r2v";
  referenceImageUrl?: string;
  aspectRatio: AspectRatio;
  duration: number;
  seed?: number;
}

export interface SubmitResult {
  taskId: string;
  status: "submitted";
}

export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface PollResult {
  taskId: string;
  status: TaskStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  elapsedSeconds: number;
}

export interface CostEstimate {
  credits: number;
  durationSeconds: number;
}

export type AspectRatio = "9:16" | "16:9" | "1:1";

export interface IVideoModelAdapter {
  readonly modelId: string;
  readonly displayName: string;
  readonly capabilities: ModelCapabilities;

  submit(params: GenerateParams): Promise<SubmitResult>;
  poll(taskId: string): Promise<PollResult>;
  getStatus(taskId: string): Promise<TaskStatus>;
  getCost(params: GenerateParams): Promise<CostEstimate>;
}
