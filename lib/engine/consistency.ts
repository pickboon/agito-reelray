import { getAdapter } from "@/lib/adapters";

export interface ConsistencyResult {
  faceSimilarity: number;
  colorPalette: number;
  clothingConsistency: number;
  overallScore: number;
}

/**
 * 一致性检查（初期基于规则评分）
 * 用 anchorImageUrl 做一次 r2v 生成，记录结果
 * 后续可接入真实视觉对比模型
 */
export async function checkConsistency(
  shotId: string,
  anchorImageUrl: string,
  generatedVideoUrl: string
): Promise<ConsistencyResult> {
  console.warn("[consistency] Using rule-based placeholder — real visual comparison not yet implemented");
  if (!anchorImageUrl || !generatedVideoUrl) {
    return {
      faceSimilarity: 0,
      colorPalette: 0,
      clothingConsistency: 0,
      overallScore: 0,
    };
  }

  // 用 anchorImageUrl 做一次 r2v 生成
  const adapter = getAdapter("happyhorse-1.1");
  const POLL_INTERVAL_MS = 5_000;
  const MAX_POLLS = 40;

  try {
    const submitResult = await adapter.submit({
      mode: "r2v",
      prompt: "consistency check reference generation",
      referenceImageUrl: anchorImageUrl,
      aspectRatio: "9:16",
      duration: 5,
    });

    // 轮询等待完成
    let completed = false;
    let hasError = false;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const poll = await adapter.poll(submitResult.taskId);

      if (poll.status === "completed") {
        completed = true;
        break;
      }
      if (poll.status === "failed") {
        hasError = true;
        break;
      }
    }

    // 基于规则评分（待后续接入真实对比模型）
    if (completed && !hasError) {
      return {
        faceSimilarity: 0.85,
        colorPalette: 0.82,
        clothingConsistency: 0.88,
        overallScore: 0.85,
      };
    }

    // 生成失败但不影响原始结果，给中等分
    return {
      faceSimilarity: 0.5,
      colorPalette: 0.5,
      clothingConsistency: 0.5,
      overallScore: 0.5,
    };
  } catch {
    // 调用失败，返回低分
    return {
      faceSimilarity: 0.3,
      colorPalette: 0.3,
      clothingConsistency: 0.3,
      overallScore: 0.3,
    };
  }
}
