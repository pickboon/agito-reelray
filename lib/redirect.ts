/**
 * 安全重定向工具 — 防止 Open Redirect 攻击
 * 仅允许相对路径（以 / 开头），禁止协议跳转和双斜杠
 */
export function safeRedirect(
  redirectTo: string | null | undefined,
  fallback: string = "/dashboard"
): string {
  if (!redirectTo) return fallback;
  if (!redirectTo.startsWith("/") || redirectTo.startsWith("//")) return fallback;
  if (/^(javascript|data|vbscript):/i.test(redirectTo)) return fallback;
  return redirectTo;
}
