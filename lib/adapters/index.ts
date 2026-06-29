export type { IVideoModelAdapter, ModelCapabilities, GenerateParams, SubmitResult, PollResult, CostEstimate, TaskStatus, AspectRatio } from "./types";
export { HappyHorseAdapter } from "./happyhorse";

import type { IVideoModelAdapter } from "./types";
import { HappyHorseAdapter } from "./happyhorse";

const adapters: Record<string, () => IVideoModelAdapter> = {
  "happyhorse-1.1": () => new HappyHorseAdapter(),
};

export function getAdapter(modelId: string): IVideoModelAdapter {
  const factory = adapters[modelId];
  if (!factory) {
    throw new Error(`Unknown model adapter: ${modelId}`);
  }
  return factory();
}
