/**
 * 安全日志封装 — 防止敏感信息泄露
 * 仅提取 error.message + error.code，不打印 stack/details/用户数据
 */
export const logger = {
  error(context: string, error: unknown): void {
    const message = extractMessage(error);
    console.error(`[${context}] ${message}`);
  },

  warn(context: string, message: string): void {
    console.warn(`[${context}] ${message}`);
  },

  info(context: string, message: string): void {
    console.log(`[${context}] ${message}`);
  },
};

function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as Record<string, unknown>).message);
  }
  return "unknown error";
}
