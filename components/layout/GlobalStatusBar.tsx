"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Zap, Clock } from "lucide-react";

export function GlobalStatusBar() {
  const [credits, setCredits] = useState<number | null>(null);
  const [renderCount, setRenderCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // 并行取订阅（积分）和渲染中任务数
      const [subRes, renderRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("credits_remaining")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle(),
        supabase
          .from("shots")
          .select("id", { count: "exact", head: true })
          .eq("status", "generating"),
      ]);

      if (subRes.data) setCredits(subRes.data.credits_remaining);
      if (!renderRes.error) setRenderCount(renderRes.count ?? 0);
    }
    fetch();

    // 每 30s 轮询一次
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (credits === null && renderCount === null) {
    return (
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-center gap-1 text-[10px] text-sidebar-foreground/30">
          <Loader2 className="h-3 w-3 animate-spin" />
          同步中…
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-3 space-y-1.5">
      {/* 渲染队列 */}
      <Link href="/dashboard/queue" className="flex items-center gap-2 text-[11px] text-sidebar-foreground/60 hover:text-brand-cyan transition-colors cursor-pointer">
        <Clock className="h-3 w-3 text-brand-cyan/70" />
        <span className="flex-1">渲染队列</span>
        <span className="font-mono font-semibold text-sidebar-foreground">
          {renderCount ?? 0} 任务
        </span>
      </Link>

      {/* 积分 */}
      <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/60 mt-1">
        <Zap className="h-3 w-3 text-brand-gold/70" />
        <span className="flex-1">Credits</span>
        <span className="font-mono font-semibold text-brand-gold">
          {credits?.toLocaleString() ?? "—"}
        </span>
      </div>
    </div>
  );
}
