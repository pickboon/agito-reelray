import { getAdapter } from "@/lib/adapters";
import { uploadFile, generateR2Key } from "@/lib/r2";

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];
const POLL_INTERVAL_MS = 5_000;
const MAX_POLLS = 40;

export interface AnchorResult {
  anchorUrl: string;
  r2Key: string;
  params: Record<string, unknown>;
}

/**
 * 生成角色锚点图（r2v 模式）
 * 3 次自动重试 + 指数退避
 */
export async function generateAnchor(
  characterId: string,
  referenceImageUrls: string[]
): Promise<AnchorResult> {
  if (!referenceImageUrls.length) {
    throw new Error(`角色 ${characterId} 没有参考图`);
  }

  const adapter = getAdapter("happyhorse-1.1");
  const params = {
    mode: "r2v" as const,
    prompt:
      "character anchor reference, neutral expression, standard lighting, full body",
    referenceImageUrl: referenceImageUrls[0],
    aspectRatio: "9:16" as const,
    duration: 5,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
    }

    try {
      const submitResult = await adapter.submit(params);

      // 轮询等待完成
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const poll = await adapter.poll(submitResult.taskId);

        if (poll.status === "completed" && poll.videoUrl) {
          // 下载视频到 Buffer
          const resp = await fetch(poll.videoUrl);
          if (!resp.ok) {
            throw new Error(`下载视频失败: ${resp.status}`);
          }
          const buf = Buffer.from(await resp.arrayBuffer());

          const r2Key = generateR2Key(
            "anchors",
            `${characterId}_${Date.now()}.mp4`
          );
          const anchorUrl = await uploadFile(r2Key, buf, "video/mp4");

          return {
            anchorUrl,
            r2Key,
            params: { ...params, taskId: submitResult.taskId },
          };
        }

        if (poll.status === "failed") {
          throw new Error(poll.errorMessage ?? "r2v 生成失败");
        }
      }

      throw new Error("锚点图生成超时");
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error("锚点图生成失败（未知错误）");
}
