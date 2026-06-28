// ============================================================
// 基础 CSRF 防护 — Double-Submit Cookie 模式
// middleware 注入 cookie，API POST 路由验证 header 与 cookie 一致
// ============================================================

import { NextRequest } from "next/server";

const CSRF_COOKIE_NAME = "__csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * 生成随机 CSRF token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 验证请求中的 CSRF token 是否与 cookie 一致
 * 仅对非 GET/HEAD/OPTIONS 请求验证
 */
export function validateCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) {
    // 没有 cookie 时放行（首次请求/SSR 场景）
    return true;
  }

  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  return cookieToken === headerToken;
}
