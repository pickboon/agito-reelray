"use client";

import { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-fetch";
import { Play, Video, Hash, Clock, Image, CheckCircle, Loader2, RefreshCw, AlertTriangle } from "lucide-react";

interface ShotData {
  id: string;
  shot_number: number;
  prompt: string;
  status: string;
  model: string;
  mode: string;
  aspect_ratio: string;
  duration: number;
  seed: number | null;
  video_url: string | null;
  elapsed_seconds: number | null;
  credits_consumed: number | null;
  error_message: string | null;
  consistency_score?: number | null;
  consistency_checks?: {
    faceSimilarity: number;
    colorPalette: number;
    clothingConsistency: number;
    overallScore: number;
  } | null;
}

function scoreColor(score: number): string {
  if (score >= 0.8) return "text-brand-green";
  if (score >= 0.6) return "text-brand-gold";
  return "text-destructive";
}

interface ShotDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shotId: string | null;
  projectId: string;
  episodeId: string;
  onShotUpdated?: () => void;
}

export function ShotDrawer({ open, onOpenChange, shotId, projectId, episodeId, onShotUpdated }: ShotDrawerProps) {
  const [data, setData] = useState<ShotData | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checkingConsistency, setCheckingConsistency] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!shotId || !open) {
      setData(null);
      setPrompt("");
      setError(null);
      return;
    }

    async function fetchShot() {
      setLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: shotData, error: err } = await supabase
        .from("shots")
        .select("*")
        .eq("id", shotId)
        .single();

      if (err) {
        setError("加载镜头失败");
        setLoading(false);
        return;
      }

      setData(shotData as ShotData);
      setPrompt(shotData.prompt || "");
      setLoading(false);
    }
    fetchShot();
  }, [shotId, open]);

  const refreshData = async () => {
    if (!shotId) return;
    const supabase = createClient();
    const { data: updated } = await supabase
      .from("shots")
      .select("*")
      .eq("id", shotId)
      .single();
    if (updated) {
      setData(updated as ShotData);
      onShotUpdated?.();
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await apiFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shot_id: data?.id,
          prompt,
          mode: data?.mode ?? "t2v",
          model: data?.model ?? "happyhorse-1.1-t2v",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "生成失败");
      } else {
        await refreshData();
      }
    } catch {
      alert("生成请求失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleCheckConsistency = async () => {
    setCheckingConsistency(true);
    try {
      const res = await apiFetch("/api/engine/check-consistency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shotId: data?.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "一致性检查失败");
      } else {
        await refreshData();
      }
    } catch {
      alert("检查请求失败");
    } finally {
      setCheckingConsistency(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {!shotId ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-muted-foreground">未选择镜头</p>
          </div>
        ) : loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-5 py-2">
            {/* Header */}
            <SheetHeader>
              <div className="flex items-center gap-2">
                <SheetTitle className="text-lg">Shot {data.shot_number}</SheetTitle>
                <Badge
                  variant={
                    data.status === "completed"
                      ? "default"
                      : data.status === "failed"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[11px]"
                >
                  {data.status === "generating" ? "生成中" : data.status === "completed" ? "已完成" : data.status === "failed" ? "失败" : data.status}
                </Badge>
              </div>
            </SheetHeader>

            {/* 1. 顶层预览 */}
            <div className="rounded-lg overflow-hidden bg-black/40 border border-border">
              {data.video_url ? (
                <video
                  ref={videoRef}
                  src={data.video_url}
                  controls
                  className="w-full aspect-video"
                />
              ) : (
                <div className="flex items-center justify-center aspect-video">
                  <div className="text-center">
                    <Video className="h-8 w-8 mx-auto text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground mt-2">暂无可预览视频</p>
                  </div>
                </div>
              )}
              {data.error_message && (
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-destructive bg-destructive/5">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  {data.error_message}
                </div>
              )}
            </div>

            {/* 2. AI 生成引擎 — Prompt 编辑 */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Prompt
              </label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入视频生成提示词…"
                className="min-h-24 text-sm font-sans"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  size="sm"
                  className="gap-1.5 flex-1"
                >
                  {generating ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />提交中…</>
                  ) : (
                    <><Play className="h-3.5 w-3.5" />生成 (消耗 Credits)</>
                  )}
                </Button>
                <Button
                  onClick={refreshData}
                  variant="outline"
                  size="sm"
                  disabled={generating}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* 3. 参数面板 */}
            <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Parameters
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground font-mono text-xs text-right">{data.model || "happyhorse-1.1-t2v"}</span>
                <span className="text-muted-foreground">Mode</span>
                <span className="text-right"><Badge variant="outline" className="text-[10px]">{data.mode || "t2v"}</Badge></span>
                <span className="text-muted-foreground">Aspect</span>
                <span className="text-foreground text-right">{data.aspect_ratio || "9:16"}</span>
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground text-right">{data.duration ?? 5}s</span>
                <span className="text-muted-foreground">Seed</span>
                <span className="text-foreground font-mono text-xs text-right">{data.seed ?? "—"}</span>
              </div>
            </div>

            {/* 一致性评分 */}
            <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  一致性评分
                </h4>
                {data.video_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] gap-1"
                    disabled={checkingConsistency}
                    onClick={handleCheckConsistency}
                  >
                    {checkingConsistency ? (
                      <><Loader2 className="h-3 w-3 animate-spin" />检查中…</>
                    ) : (
                      <><CheckCircle className="h-3 w-3" />检查</>
                    )}
                  </Button>
                )}
              </div>
              {data.consistency_score != null ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">综合评分</span>
                    <span className={`font-mono font-semibold ${scoreColor(data.consistency_score)}`}>
                      {(data.consistency_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  {data.consistency_checks && (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">面部相似度</span>
                        <span className={scoreColor(data.consistency_checks.faceSimilarity)}>
                          {(data.consistency_checks.faceSimilarity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">色彩一致性</span>
                        <span className={scoreColor(data.consistency_checks.colorPalette)}>
                          {(data.consistency_checks.colorPalette * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">服装一致性</span>
                        <span className={scoreColor(data.consistency_checks.clothingConsistency)}>
                          {(data.consistency_checks.clothingConsistency * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">尚未检查</p>
              )}
            </div>

            {/* 生成统计 */}
            {data.elapsed_seconds != null && (
              <div className="rounded-lg border border-border bg-card/50 p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Stats</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">耗时</span>
                  <span className="text-foreground">{data.elapsed_seconds}s</span>
                </div>
                {data.credits_consumed != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Credits</span>
                    <span className="text-brand-gold font-medium">{data.credits_consumed.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
