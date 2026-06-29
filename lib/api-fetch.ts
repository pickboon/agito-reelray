/**
 * 客户端 API 请求封装 — 自动注入 CSRF header
 * 用法与 fetch 一致，自动处理 x-csrf-token
 */

import { getCsrfHeader } from "@/lib/csrf";

type FetchInit = RequestInit & {
  json?: unknown;
};

export async function apiFetch(url: string, init?: FetchInit): Promise<Response> {
  const { json, ...rest } = init ?? {};

  const headers = new Headers(rest.headers);

  // 自动注入 CSRF header（对 POST/PUT/PATCH/DELETE）
  const method = (rest.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
    const csrf = getCsrfHeader();
    if (csrf) {
      headers.set("x-csrf-token", csrf);
    }
  }

  // 自动处理 JSON body
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    rest.body = JSON.stringify(json);
  }

  return fetch(url, { ...rest, method, headers });
}
