"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wand2,
  Play,
  Download,
  Share2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  Video,
  Clock,
  Sparkles,
  XCircle,
} from "lucide-react";
import {
  VIDEO_MODELS,
  RESOLUTIONS,
  DURATIONS,
  ASPECT_RATIOS,
  LENS_OPTIONS,
} from "@/lib/models";

interface GenerationTask {
  id: string;
  model_id: string;
  prompt: string;
  mode: string;
  aspect_ratio: string;
  duration: number;
  seed?: number;
  status: string;
  task_id?: string;
  video_url?: string;
  thumbnail_url?: string;
  error_message?: string;
  credits_consumed: number;
  elapsed_seconds: number;
  created_at: string;
  updated_at: string;
}

function translateError(errorMessage?: string): string {
  if (!errorMessage) return "生成失败，请重试";
  
  const lower = errorMessage.toLowerCase();
  
  if (lower.includes("ip infringement") || lower.includes("intellectual property")) {
    return "内容涉及知识产权问题，请调整提示词避免使用受版权保护的角色、品牌或商标";
  }
  if (lower.includes("inappropriate") || lower.includes("unsafe")) {
    return "内容不符合安全规范，请调整提示词";
  }
  if (lower.includes("timeout")) {
    return "生成超时，请稍后重试";
  }
  if (lower.includes("quota") || lower.includes("rate limit")) {
    return "请求过于频繁，请稍后再试";
  }
  
  return errorMessage;
}

export default function GeneratePage() {
  const supabase = createClient();
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<GenerationTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [model, setModel] = useState("happyhorse-1.1");
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [lens, setLens] = useState("fixed");
  const [seed, setSeed] = useState("");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"t2v" | "r2v">("t2v");

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll running tasks every 3 seconds
  useEffect(() => {
    const runningTasks = tasks.filter((t) => t.status === "running");
    if (runningTasks.length > 0) {
      pollingRef.current = setInterval(() => {
        runningTasks.forEach((task) => pollTask(task.id));
      }, 3000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tasks]);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/generation/list?limit=20");
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
        if (data.tasks.length > 0 && !selectedTask) {
          setSelectedTask(data.tasks[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }

  async function pollTask(taskId: string) {
    try {
      const res = await fetch(`/api/generation/status?task_id=${taskId}`);
      const updated = await res.json();
      if (updated.status) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
      }
    } catch (error) {
      console.error("Poll failed:", error);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const res = await fetch("/api/generation/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: model,
          prompt: prompt.trim(),
          mode,
          reference_image_url: mode === "r2v" ? imageUrl : null,
          aspect_ratio: aspectRatio,
          duration,
          seed: seed ? parseInt(seed) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "生成失败，请检查积分或稍后重试");
        return;
      }

      // Refresh tasks list
      await fetchTasks();
    } catch (error) {
      console.error("Generate failed:", error);
      alert("网络错误，请检查连接后重试");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!selectedTask?.video_url) return;
    const a = document.createElement("a");
    a.href = selectedTask.video_url;
    a.download = `video-${selectedTask.id}.mp4`;
    a.click();
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return <Badge variant="outline">等待中</Badge>;
      case "running":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            生成中
          </Badge>
        );
      case "completed":
        return <Badge variant="default">已完成</Badge>;
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            失败
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const selectedModel = VIDEO_MODELS.find((m) => m.id === model);

  return (
    <div className="h-[calc(100vh-3rem)] flex gap-4 -mx-6 -my-6 px-6 py-6">
      {/* Left: Parameters */}
      <Card className="w-80 shrink-0 overflow-y-auto">
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">模型</label>
            <Select value={model} onValueChange={(v) => setModel(v ?? "happyhorse-1.1")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id} disabled={!m.available}>
                    <div className="flex items-center gap-2">
                      <span>{m.name}</span>
                      {m.badge && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0">
                          {m.badge}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedModel && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedModel.description}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">生成模式</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === "t2v" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("t2v")}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                文生视频
              </Button>
              <Button
                variant={mode === "r2v" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("r2v")}
              >
                <ImageIcon className="h-4 w-4 mr-1" />
                图生视频
              </Button>
            </div>
          </div>

          {mode === "r2v" && (
            <div>
              <label className="text-sm font-medium mb-2 block">参考图片 URL</label>
              <input
                type="text"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm font-medium mb-2 block">分辨率</label>
              <Select value={resolution} onValueChange={(v) => setResolution(v ?? "720p")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOLUTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">时长</label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v ?? "5"))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value.toString()}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">画面比例</label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((ar) => (
                <Button
                  key={ar.value}
                  variant={aspectRatio === ar.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAspectRatio(ar.value)}
                  className="h-auto py-2 flex-col gap-1"
                >
                  <span className="font-medium">{ar.label}</span>
                  <span className="text-xs opacity-70">{ar.description}</span>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">镜头控制</label>
            <Select value={lens} onValueChange={(v) => setLens(v ?? "fixed")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LENS_OPTIONS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label} - {l.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">种子 (可选)</label>
            <input
              type="number"
              placeholder="留空则随机"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">提示词</label>
            <Textarea
              placeholder="描述你想要的视频内容..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || !selectedModel?.available}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                开始生成
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Middle: History */}
      <Card className="flex-1 overflow-y-auto">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">生成历史</h2>
            <Badge variant="secondary">{tasks.length} 个任务</Badge>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>还没有生成记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    selectedTask?.id === task.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedTask(task)}
                >
                  <CardContent className="p-3 flex gap-3">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 shrink-0 bg-muted rounded flex items-center justify-center">
                      {task.thumbnail_url ? (
                        <img
                          src={task.thumbnail_url}
                          alt="Thumbnail"
                          className="w-full h-full object-cover rounded"
                        />
                      ) : task.status === "running" ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <Video className="h-6 w-6 text-muted-foreground/50" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(task.status)}
                        <span className="text-xs text-muted-foreground">
                          {formatTime(task.created_at)}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-1">{task.prompt}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{task.model_id}</span>
                        <span>•</span>
                        <span>{task.duration}秒</span>
                        <span>•</span>
                        <span>{task.aspect_ratio}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: Detail */}
      <Card className="w-96 shrink-0 overflow-y-auto">
        <CardContent className="p-4">
          {selectedTask ? (
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="aspect-video bg-muted rounded flex items-center justify-center">
                {selectedTask.video_url ? (
                  <video
                    src={selectedTask.video_url}
                    controls
                    className="w-full h-full rounded"
                  />
                ) : selectedTask.status === "running" ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">生成中...</p>
                  </div>
                ) : selectedTask.status === "failed" ? (
                  <div className="text-center text-destructive px-4">
                    <p className="text-sm mb-2">{translateError(selectedTask.error_message)}</p>
                    <p className="text-xs opacity-70">可以修改提示词后重新生成</p>
                  </div>
                ) : (
                  <Video className="h-12 w-12 text-muted-foreground/30" />
                )}
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">状态</label>
                  <div className="mt-1">{getStatusBadge(selectedTask.status)}</div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">提示词</label>
                  <p className="text-sm mt-1">{selectedTask.prompt}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <label className="text-xs text-muted-foreground">模型</label>
                    <p className="mt-1">{selectedTask.model_id}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">时长</label>
                    <p className="mt-1">{selectedTask.duration}秒</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">比例</label>
                    <p className="mt-1">{selectedTask.aspect_ratio}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">积分消耗</label>
                    <p className="mt-1">{selectedTask.credits_consumed}</p>
                  </div>
                </div>

                {selectedTask.elapsed_seconds > 0 && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>耗时 {selectedTask.elapsed_seconds}秒</span>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground">创建时间</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedTask.created_at).toLocaleString("zh-CN")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              {selectedTask.status === "completed" && (
                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    下载
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>选择一个任务查看详情</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
