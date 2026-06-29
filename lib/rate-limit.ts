// ============================================================
// Rate Limit — DB-backed 实现
// S-04: 替代内存 Map，支持多实例部署
// 使用 Supabase RPC check_rate_limit 函数
// ============================================================

import { createServerSupabaseClient } from "@/lib/supabase/server";

// 进程内缓存作为 fallback（单实例部署时仍有效）
const fallbackMap = new Map<string, { count: number; resetAt: number }>();

/**
 * 检查速率限制
 * 优先使用 DB-backed RPC，失败时 fallback 到内存 Map
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    });

    if (error) {
      console.warn("[rate-limit] RPC failed, using fallback:", error.message);
      return fallbackCheck(key, maxRequests, windowMs);
    }

    return data as boolean;
  } catch {
    return fallbackCheck(key, maxRequests, windowMs);
  }
}

function fallbackCheck(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = fallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    fallbackMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
