"use client";

import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          出了点问题
        </h1>
        <p className="text-muted-foreground mb-8">
          应用遇到了意外错误，请尝试重试。
        </p>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            如果问题持续，请联系技术支持。
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground/60 font-mono">
              错误编号: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-md btn-primary text-sm font-medium"
          >
            重试
          </button>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
