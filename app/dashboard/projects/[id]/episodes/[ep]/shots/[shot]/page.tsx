"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Video, Hash, Clock, Image, CheckCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api-fetch";

interface Shot {
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
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

export default function ShotDetailPage({
  params,
}: {
  params: Promise<{ id: string; ep: string; shot: string }>;
}) {
  const { id, ep, shot } = use(params);
  const [data, setData] = useState<Shot | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checkingConsistency, setCheckingConsistency] = useState(false);

  useEffect(() => {
    async function fetchShot() {
      const supabase = createClient();
      const { data: shotData, error: err } = await supabase
        .from("shots")
        .select("*")
        .eq("id", shot)
        .single();

      if (err) {
        setError("加载镜头失败");
        setLoading(false);
        return;
      }

      setData(shotData as Shot);
      setPrompt(shotData.prompt || "");
      setLoading(false);
    }
    fetchShot();
  }, [shot]);

  const refreshData = async () => {
    const supabase = createClient();
    const { data: updated } = await supabase
      .from("shots")
      .select("*")
      .eq("id", shot)
      .single();
    if (updated) setData(updated as Shot);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error ?? "镜头不存在"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}/episodes/${ep}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回集详情
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            Shot {data.shot_number}
          </h1>
          <Badge
            variant={
              data.status === "completed"
                ? "default"
                : data.status === "failed"
                ? "destructive"
                : "secondary"
            }
          >
            {data.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 预览区 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4">
              {data.video_url ? (
                <video
                  src={data.video_url}
                  controls
                  className="w-full rounded-lg aspect-video bg-black"
                />
              ) : (
                <div className="flex items-center justify-center aspect-video bg-secondary/30 rounded-lg">
                  <div className="text-center">
                    <Video className="h-10 w-10 mx-auto text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mt-2">
                      暂无可预览视频
                    </p>
                  </div>
                </div>
              )}
              {data.error_message && (
                <p className="mt-3 text-sm text-destructive">
                  错误: {data.error_message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Prompt 编辑 */}
          <div className="space-y-2">
            <Label htmlFor="prompt" className="text-sm text-foreground">
              Prompt
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="输入视频生成提示词…"
              className="min-h-32 font-sans text-sm"
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="gap-1.5"
            >
              <Play className="h-4 w-4" />
              {generating ? "提交中…" : "Generate"}
            </Button>
          </div>
        </div>

        {/* 参数面板 */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 py-4">
              <h3 className="text-sm font-semibold text-foreground">
                Parameters
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    Model
                  </span>
                  <span className="text-foreground font-mono text-xs">
                    {data.model || "happyhorse-1.1-t2v"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="h-3.5 w-3.5" />
                    Mode
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {data.mode || "t2v"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="h-3.5 w-3.5" />
                    Aspect
                  </span>
                  <span className="text-foreground">
                    {data.aspect_ratio || "9:16"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Duration
                  </span>
                  <span className="text-foreground">
                    {data.duration ?? 5}s
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    Seed
                  </span>
                  <span className="text-foreground font-mono text-xs">
                    {data.seed ?? "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 一致性评分 */}
          {data.video_url && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    一致性评分
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1"
                    disabled={checkingConsistency}
                    onClick={handleCheckConsistency}
                  >
                    {checkingConsistency ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    {checkingConsistency ? "检查中…" : "检查"}
                  </Button>
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
              </CardContent>
            </Card>
          )}

          {/* 生成统计 */}
          {data.elapsed_seconds != null && (
            <Card>
              <CardContent className="space-y-3 py-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Stats
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">耗时</span>
                  <span className="text-foreground">
                    {data.elapsed_seconds}s
                  </span>
                </div>
                {data.credits_consumed != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Credits</span>
                    <span className="text-brand-gold font-medium">
                      {data.credits_consumed.toLocaleString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
