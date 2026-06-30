"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Play,
  Download,
} from "lucide-react";

interface QueueItem {
  id: string;
  taskLabel: string;
  source: string;
  model: string;
  status: string;
  elapsedTime: string;
  videoUrl: string | null;
  errorMessage: string | null;
  taskId: string | null;
  updatedAt: string;
  type: "shot" | "task";
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; animated?: boolean }> = {
  submitted: { label: "⏳ 排队", variant: "outline" },
  pending: { label: "⏳ 排队", variant: "outline" },
  generating: { label: "⚙️ 生成中", variant: "default", animated: true },
  running: { label: "⚙️ 生成中", variant: "default", animated: true },
  completed: { label: "✅ 完成", variant: "secondary" },
  failed: { label: "❌ 失败", variant: "destructive" },
};

export default function QueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const userId = session.user.id;
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // 并行取两个数据源
      const [shotsRes, tasksRes] = await Promise.all([
        supabase
          .from("shots")
          .select("id, shot_number, prompt, status, model, video_url, elapsed_seconds, credits_consumed, error_message, task_id, updated_at, episodes(project_id(title))")
          .in("status", ["submitted", "generating", "completed", "failed"])
          .order("updated_at", { ascending: false })
          .limit(100),
        supabase
          .from("generation_tasks")
          .select("id, prompt, status, model_id, task_id, video_url, elapsed_seconds, error_message, created_at, updated_at")
          .in("status", ["pending", "running", "completed", "failed"])
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const merged: QueueItem[] = [];

      // 处理 shots
      if (shotsRes.data) {
        for (const shot of shotsRes.data) {
          const updatedAt = shot.updated_at;
          if (!updatedAt) continue;
          const updatedDate = new Date(updatedAt);
          // 过滤 24h 外的 completed/failed
          if (["completed", "failed"].includes(shot.status) && updatedDate < twentyFourHoursAgo) continue;

          const episodeData = (shot as Record<string, unknown>).episodes as Record<string, unknown> | null;
          const projectData = episodeData?.project_id as Record<string, unknown> | null;
          const source = projectData?.title as string ?? "未知项目";

          merged.push({
            id: shot.id,
            taskLabel: `Shot #${shot.shot_number}`,
            source,
            model: shot.model ?? "happyhorse-1.1",
            status: shot.status,
            elapsedTime: shot.elapsed_seconds ? `${shot.elapsed_seconds}s` : "—",
            videoUrl: shot.video_url,
            errorMessage: shot.error_message,
            taskId: shot.task_id,
            updatedAt,
            type: "shot",
          });
        }
      }

      // 处理 generation_tasks
      if (tasksRes.data) {
        for (const task of tasksRes.data) {
          const updatedAt = task.updated_at ?? task.created_at;
          if (!updatedAt) continue;
          const updatedDate = new Date(updatedAt);
          if (["completed", "failed"].includes(task.status) && updatedDate < twentyFourHoursAgo) continue;

          const taskShortId = task.task_id ? task.task_id.slice(0, 8) : task.id.slice(0, 8);
          merged.push({
            id: task.id,
            taskLabel: `沙盒生成 #${taskShortId}`,
            source: "灵感沙盒",
            model: task.model_id ?? "happyhorse-1.1",
            status: task.status,
            elapsedTime: task.elapsed_seconds ? `${task.elapsed_seconds}s` : "—",
            videoUrl: task.video_url,
            errorMessage: task.error_message,
            taskId: task.task_id,
            updatedAt,
            type: "task",
          });
        }
      }

      // 按时间排序
      merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setItems(merged);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[Queue] fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 初始加载 + 轮询
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  // 上次刷新倒计时
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (lastRefresh) {
        setSecondsAgo(Math.floor((Date.now() - lastRefresh.getTime()) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lastRefresh]);

  function formatStatus(status: string) {
    const s = statusMap[status] ?? { label: status, variant: "outline" as const };
    return s;
  }

  return (
    <div className="space-y-6 animate-hud-fade-in">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-heading font-semibold uppercase tracking-wider text-foreground">
            渲染队列
          </h1>
          <p className="text-sm text-muted-foreground mt-1">RENDER QUEUE</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>30s</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-cyan/30"></div>
            </label>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* 表格 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-brand-cyan" />
        </div>
      ) : items.length === 0 ? (
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-foreground mb-2">没有进行中的渲染任务</p>
            <p className="text-xs text-muted-foreground mb-4">
              在灵感沙盒或项目中生成视频后，任务会出现在这里
            </p>
            <Link href="/dashboard/forge">
              <Button size="sm" variant="outline">
                去灵感沙盒
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 桌面表头 */}
          <div className="hidden sm:grid grid-cols-6 gap-4 text-xs text-muted-foreground py-2 px-3">
            <span>任务</span>
            <span>来源</span>
            <span>模型</span>
            <span>状态</span>
            <span>耗时</span>
            <span>操作</span>
          </div>

          {/* 数据行 */}
          <div className="space-y-2">
            {items.map((item) => {
              const s = formatStatus(item.status);
              return (
                <Card key={item.id} className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="sm:grid sm:grid-cols-6 sm:gap-4 sm:items-center py-3 space-y-2 sm:space-y-0">
                    <div className="text-sm font-medium text-foreground truncate">{item.taskLabel}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.source}</div>
                    <div className="text-xs text-muted-foreground font-mono">{item.model}</div>
                    <div>
                      <Badge variant={s.variant} className={s.animated ? "animate-pulse" : ""}>
                        {s.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{item.elapsedTime}</div>
                    <div className="flex items-center gap-2">
                      {item.status === "completed" && item.videoUrl && (
                        <>
                          <a
                            href={item.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline"
                          >
                            <Play className="h-3 w-3" />
                            预览
                          </a>
                          <a
                            href={item.videoUrl}
                            download
                            className="inline-flex items-center gap-1 text-xs text-brand-gold hover:underline"
                          >
                            <Download className="h-3 w-3" />
                            下载
                          </a>
                        </>
                      )}
                      {item.status === "failed" && item.errorMessage && (
                        <span className="text-xs text-destructive truncate" title={item.errorMessage}>
                          {item.errorMessage}
                        </span>
                      )}
                      {s.animated && (
                        <Loader2 className="h-4 w-4 animate-spin text-brand-cyan" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* 底部 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/[0.06]">
        <span>上次刷新: {secondsAgo} 秒前</span>
        <span>已完成任务保留 24 小时后自动清理</span>
      </div>
    </div>
  );
}
