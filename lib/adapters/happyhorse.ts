import type {
  IVideoModelAdapter,
  ModelCapabilities,
  GenerateParams,
  SubmitResult,
  PollResult,
  CostEstimate,
  TaskStatus,
} from "./types";

export class HappyHorseAdapter implements IVideoModelAdapter {
  readonly modelId = "happyhorse-1.1";
  readonly displayName = "HappyHorse 1.1";
  readonly capabilities: ModelCapabilities = {
    t2v: true,
    r2v: true,
    maxDuration: 15,
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    maxReferenceImages: 9,
    nativeAudio: true,
    lipSyncLanguages: ["zh", "en", "ja", "ko", "es", "fr", "pt"],
  };

  private get baseUrl(): string {
    return process.env.HAPPYHORSE_BASE_URL ?? "https://dashscope.aliyuncs.com";
  }

  private get apiKey(): string {
    const key = process.env.HAPPYHORSE_API_KEY;
    if (!key) throw new Error("Missing env: HAPPYHORSE_API_KEY");
    return key;
  }

  async submit(params: GenerateParams): Promise<SubmitResult> {
    const endpoint = `${this.baseUrl}${process.env.HAPPYHORSE_T2V_ENDPOINT}`;

    const body: Record<string, unknown> = {
      model: params.mode === "t2v" ? "happyhorse-1.1-t2v" : "happyhorse-1.1-r2v",
      input: {
        prompt: params.prompt,
        ...(params.mode === "r2v" && params.referenceImageUrl
          ? { ref_img_url: params.referenceImageUrl }
          : {}),
      },
      parameters: {
        size: this.aspectToSize(params.aspectRatio),
        duration: params.duration,
        ...(params.seed !== undefined ? { seed: params.seed } : {}),
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HappyHorse submit failed: ${response.status} ${error}`);
    }

    const data = await response.json();
    return {
      taskId: data.output?.task_id ?? data.task_id,
      status: "submitted",
    };
  }

  async poll(taskId: string): Promise<PollResult> {
    const endpoint = `${this.baseUrl}/api/v1/tasks/${taskId}`;

    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HappyHorse poll failed: ${response.status}`);
    }

    const data = await response.json();
    const output = data.output ?? data;
    const status = this.mapStatus(output.task_status ?? output.status);

    return {
      taskId,
      status,
      videoUrl: output.video_url,
      thumbnailUrl: output.thumbnail_url,
      errorMessage: output.message,
      elapsedSeconds: output.elapsed_seconds ?? 0,
    };
  }

  async getStatus(taskId: string): Promise<TaskStatus> {
    const result = await this.poll(taskId);
    return result.status;
  }

  async getCost(params: GenerateParams): Promise<CostEstimate> {
    // 标准消耗：9:16/1:1 = 10,000 Credits，16:9 横屏 = 12,000 Credits
    const credits = params.aspectRatio === "16:9" ? 12000 : 10000;
    return { credits, durationSeconds: params.duration };
  }

  private mapStatus(raw: string): TaskStatus {
    const map: Record<string, TaskStatus> = {
      pending: "pending",
      running: "running",
      succeeded: "completed",
      completed: "completed",
      failed: "failed",
    };
    return map[raw] ?? "pending";
  }

  private aspectToSize(aspect: string): string {
    const map: Record<string, string> = {
      "9:16": "720*1280",
      "16:9": "1280*720",
      "1:1": "720*720",
    };
    return map[aspect] ?? "720*1280";
  }
}
