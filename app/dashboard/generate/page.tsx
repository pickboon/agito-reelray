"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  VIDEO_MODELS,
  RESOLUTIONS,
  DURATIONS,
  ASPECT_RATIOS,
  LENS_OPTIONS,
} from "@/lib/models";
import { apiFetch } from "@/lib/api-fetch";

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

// P0-1: 错误翻译兜底 — 所有未知错误均返回中文提示
function translateError(errorMessage?: string): string {
  if (!errorMessage) return "生成失败，请重试";

  const lower = errorMessage.toLowerCase();

  if (lower.includes("ip infringement") || lower.includes("intellectual property")) {
    return "内容涉及知识产权问题，请调整提示词避免使用受版权保护的角色、品牌或商标";
  }
  if (lower.includes("inappropriate") || lower.includes("unsafe") || lower.includes("nsfw")) {
    return "内容不符合安全规范，请调整提示词";
  }
  if (lower.includes("sensitive content") || lower.includes("moderation")) {
    return "内容触发了安全审核，请修改描述后重试";
  }
  if (lower.includes("timeout")) {
    return "生成超时，请稍后重试";
  }
  if (lower.includes("quota") || lower.includes("rate limit")) {
    return "请求过于频繁，请稍后再试";
  }
  if (lower.includes("internal") || lower.includes("server error")) {
    return "服务端异常，请稍后重试";
  }
  // P0-1 兜底：未知错误不再暴露原始英文
  return `生成失败：${errorMessage.slice(0, 80)}。请调整提示词后重试`;
}

// 预估生成等待时间（基于历史数据）
function estimateWaitTime(durationSec: number): string {
  // HappyHorse 典型比例：视频时长 × 15~30 = 生成秒数
  const low = Math.round(durationSec * 15 / 60);
  const high = Math.round(durationSec * 30 / 60);
  return `预计等待 ${low}-${high} 分钟`;
}

const PAGE_SIZE = 20;

export default function GeneratePage() {
  const [tasks, setTasks] = useState<GenerationTask[]>([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedTask, setSelectedTask] = useState<GenerationTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // 表单状态
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [publishDescription, setPublishDescription] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const pollErrorCountRef = useRef<Record<string, number>>({});

  // P1-4: 导入到项目状态
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importProjects, setImportProjects] = useState<{ id: string; title: string }[]>([]);
  const [importEpisodes, setImportEpisodes] = useState<{ id: string; title: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [importLoadingEpisodes, setImportLoadingEpisodes] = useState(false);

  // Read URL search params to prefill form
  const searchParams = useSearchParams();
  useEffect(() => {
    const promptParam = searchParams.get("prompt");
    const modelParam = searchParams.get("model");
    const modeParam = searchParams.get("mode");
    const aspectParam = searchParams.get("aspect_ratio");
    const durationParam = searchParams.get("duration");
    
    if (promptParam) setPrompt(promptParam);
    if (modelParam) setModel(modelParam);
    if (modeParam && (modeParam === "t2v" || modeParam === "r2v")) setMode(modeParam);
    if (aspectParam) setAspectRatio(aspectParam);
    if (durationParam) setDuration(parseInt(durationParam));
  }, [searchParams]);



  const fetchTasks = useCallback(async (pageNum = 0) => {
    try {
      const offset = pageNum * PAGE_SIZE;
      const res = await apiFetch(`/api/generation/list?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      if (data.tasks) {
        setTasks(data.tasks);
        setTotalTasks(data.total ?? data.tasks.length);
        if (data.tasks.length > 0 && !selectedTask) {
          setSelectedTask(data.tasks[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedTask]);


  // P1-3: 自动播放 — 视频完成后自动播放
  useEffect(() => {
    if (selectedTask?.status === "completed" && selectedTask.video_url && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay blocked by browser, ignore
      });
    }
  }, [selectedTask?.status, selectedTask?.video_url]);

  // P2-8: 轮询健壮性 — 处理 API 失败，连续失败 3 次后标记异常
  const pollTask = useCallback(async (taskId: string) => {
    try {
      const res = await apiFetch(`/api/generation/status?task_id=${taskId}`);
      if (!res.ok) {
        pollErrorCountRef.current[taskId] = (pollErrorCountRef.current[taskId] ?? 0) + 1;
        if (pollErrorCountRef.current[taskId] >= 5) {
          // 连续 5 次轮询失败，标记为失败
          setTasks((prev) =>
            prev.map((t) =>
              t.id === taskId
                ? { ...t, status: "failed", error_message: "轮询超时，请刷新页面重试" }
                : t
            )
          );
          toast.error("任务轮询超时，请刷新页面查看最新状态");
        }
        return;
      }
      pollErrorCountRef.current[taskId] = 0;
      const updated = await res.json();
      if (updated.status) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? updated : t))
        );
        if (selectedTask?.id === taskId) {
          setSelectedTask(updated);
        }
        if (updated.status === "completed") {
          toast.success("视频生成完成！");
        } else if (updated.status === "failed") {
          toast.error(translateError(updated.error_message));
        }
      }
    } catch (error) {
      console.error("Poll failed:", error);
      pollErrorCountRef.current[taskId] = (pollErrorCountRef.current[taskId] ?? 0) + 1;
    }
  }, [selectedTask?.id]);

  // 加载任务列表
  useEffect(() => {
    fetchTasks(page);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [page]);

  // P2-8: 轮询运行中的任务（每 4 秒）
  useEffect(() => {
    const runningTasks = tasks.filter((t) => t.status === "running");
    if (runningTasks.length > 0) {
      pollingRef.current = setInterval(() => {
        runningTasks.forEach((task) => pollTask(task.id));
      }, 4000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tasks, pollTask]);

  // P2-10: alert → toast
  async function handleGenerate() {
    if (!prompt.trim()) return;

    setGenerating(true);
    try {
      const res = await apiFetch("/api/generation/create", {
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
        toast.error(data.error || "生成失败，请检查积分或稍后重试");
        return;
      }

      toast.success("任务已提交，正在生成中…");
      setPage(0);
      await fetchTasks(0);
    } catch (error) {
      console.error("Generate failed:", error);
      toast.error("网络错误，请检查连接后重试");
    } finally {
      setGenerating(false);
    }
  }

  // P1-4: 生成任务删除（含 FK 检查）
  async function handleDeleteTask(taskId: string) {
    try {
      const res = await apiFetch(`/api/generation/delete?task_id=${taskId}`, {
        method: "DELETE",
      });

      if (res.status === 409) {
        // FK 冲突：视频已发布到社区
        const data = await res.json();
        const postTitle = data.community_post?.title ?? "未命名";
        const confirmed = window.confirm(
          `此视频已发布到社区（"${postTitle}"），删除任务将同时删除社区帖子。确定要删除吗？`
        );
        if (!confirmed) return;

        // 二次确认删除
        const confirmRes = await apiFetch(
          `/api/generation/delete?task_id=${taskId}&confirm=true`,
          { method: "DELETE" }
        );
        if (!confirmRes.ok) {
          toast.error("删除失败");
          return;
        }
      } else if (!res.ok) {
        toast.error("删除失败");
        return;
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setTotalTasks((prev) => prev - 1);
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
      }
      toast.success("已删除");
    } catch {
      toast.error("网络错误");
    }
  }

  async function handleDownload() {
    if (!selectedTask?.id) return;

    try {
      const res = await apiFetch(`/api/generation/download?task_id=${selectedTask.id}`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "获取下载链接失败");
        return;
      }

      const { download_url } = await res.json();
      const a = document.createElement("a");
      a.href = download_url;
      a.download = `video-${selectedTask.id}.mp4`;
      a.click();
      toast.success("开始下载");
    } catch {
      toast.error("下载失败，请重试");
    }
  }



  async function handleSaveTemplate() {
    if (!templateName.trim() || !prompt.trim()) {
      toast.error("请输入模板名称和提示词");
      return;
    }

    setSavingTemplate(true);
    try {
      const res = await apiFetch("/api/templates/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || undefined,
          prompt: prompt.trim(),
          model_id: selectedModel?.id ?? "happyhorse-1.1-t2v",
          mode: mode,
          aspect_ratio: aspectRatio,
          duration: duration,
          seed: seed || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "保存失败");
        return;
      }

      toast.success("模板保存成功！");
      setTemplateDialogOpen(false);
      setTemplateName("");
      setTemplateDescription("");
    } catch {
      toast.error("网络错误");
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handlePublish() {
    if (!selectedTask?.id || !publishTitle.trim()) {
      toast.error("请输入作品标题");
      return;
    }

    setPublishing(true);
    try {
      const res = await apiFetch("/api/community/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: selectedTask.id,
          title: publishTitle.trim(),
          description: publishDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "发布失败");
        return;
      }

      toast.success("发布成功！");
      setPublishDialogOpen(false);
      setPublishTitle("");
      setPublishDescription("");
    } catch {
      toast.error("网络错误");
    } finally {
      setPublishing(false);
    }
  }

  // P1-4: 导入到项目 - 加载项目列表
  async function handleOpenImportDialog() {
    if (!selectedTask || selectedTask.status !== "completed") return;
    setImportDialogOpen(true);
    setSelectedProjectId("");
    setSelectedEpisodeId("");
    setImportEpisodes([]);

    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("id, title")
      .order("updated_at", { ascending: false });
    setImportProjects((data ?? []) as { id: string; title: string }[]);
  }

  // P1-4: 选择项目后加载集列表
  async function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId);
    setSelectedEpisodeId("");
    setImportLoadingEpisodes(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("episodes")
      .select("id, title")
      .eq("project_id", projectId)
      .order("episode_number", { ascending: true });
    setImportEpisodes((data ?? []) as { id: string; title: string }[]);
    setImportLoadingEpisodes(false);
  }

  // P1-4: 确认导入
  async function handleImportToProject() {
    if (!selectedTask || !selectedEpisodeId) return;
    setImporting(true);

    try {
      const res = await apiFetch("/api/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: selectedEpisodeId,
          prompt: selectedTask.prompt,
          model: selectedTask.model_id,
          mode: selectedTask.mode,
          aspect_ratio: selectedTask.aspect_ratio,
          duration: selectedTask.duration,
          status: "completed",
          video_url: selectedTask.video_url,
          thumbnail_url: selectedTask.thumbnail_url,
          task_id: selectedTask.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "导入失败");
        return;
      }

      toast.success("已导入到项目！");
      setImportDialogOpen(false);
    } catch {
      toast.error("导入失败，请重试");
    } finally {
      setImporting(false);
    }
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
      case "needs_review":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600 gap-1">
            <AlertTriangle className="h-3 w-3" />
            需人工审核
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  const selectedModel = VIDEO_MODELS.find((m) => m.id === model);
  const totalPages = Math.ceil(totalTasks / PAGE_SIZE);

  return (
    <div className="h-[calc(100vh-3rem)] flex gap-4 -mx-6 -my-6 px-6 py-6">
      {/* 左栏：参数面板 */}
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

          {/* P2-9: 预估等待时间 */}
          {selectedModel?.available && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{estimateWaitTime(duration)}</span>
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !prompt.trim() || !selectedModel?.available}
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                开始生成
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setTemplateDialogOpen(true)}
            disabled={!prompt.trim()}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            保存为模板
          </Button>
        </CardContent>
      </Card>

      {/* 中栏：生成历史 */}
      <Card className="flex-1 overflow-y-auto">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">生成历史</h2>
            <Badge variant="secondary">{totalTasks} 个任务</Badge>
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
            <>
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
                      <div className="w-20 h-20 shrink-0 bg-muted rounded flex items-center justify-center">
                        {task.thumbnail_url ? (
                          <Image
          src={task.thumbnail_url}
          alt="Thumbnail"
          fill
          className="w-full h-full object-cover rounded"
        />
                        ) : task.status === "running" ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : task.status === "failed" ? (
                          <AlertTriangle className="h-6 w-6 text-destructive/60" />
                        ) : (
                          <Video className="h-6 w-6 text-muted-foreground/50" />
                        )}
                      </div>
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

              {/* P2-11: 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 右栏：详情预览 */}
      <Card className="w-96 shrink-0 overflow-y-auto">
        <CardContent className="p-4">
          {selectedTask ? (
            <div className="space-y-4">
              {/* 视频预览 */}
              <div className="aspect-video bg-muted rounded flex items-center justify-center">
                {selectedTask.video_url ? (
                  <video
                    ref={videoRef}
                    src={selectedTask.video_url}
                    controls
                    muted
                    playsInline
                    className="w-full h-full rounded"
                  />
                ) : selectedTask.status === "running" ? (
                  <div className="text-center px-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {estimateWaitTime(selectedTask.duration)}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      页面保持打开即可，完成后会自动刷新
                    </p>
                  </div>
                ) : selectedTask.status === "failed" ? (
                  <div className="text-center text-destructive px-4">
                    <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-60" />
                    <p className="text-sm mb-2">{translateError(selectedTask.error_message)}</p>
                    <p className="text-xs opacity-70">可以修改提示词后重新生成</p>
                  </div>
                ) : (
                  <Video className="h-12 w-12 text-muted-foreground/30" />
                )}
              </div>

              {/* 元数据 */}
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
                    <p className="mt-1">{selectedTask.credits_consumed.toLocaleString()}</p>
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

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                {selectedTask.status === "completed" && (
                  <>
                    <Button className="flex-1" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      下载
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setPublishDialogOpen(true)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      发布到社区
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleOpenImportDialog}
                      title="导入到项目"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (selectedTask?.video_url) {
                      navigator.clipboard.writeText(selectedTask.video_url);
                      toast.success("链接已复制");
                    }
                  }}
                  title="复制视频链接"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {/* P1-4: 删除按钮绑定 */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  title="删除任务"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>选择一个任务查看详情</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 发布到社区对话框 */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发布到社区</DialogTitle>
            <DialogDescription>
              分享你的作品到社区，让更多人看到
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">作品标题</label>
              <input
                type="text"
                placeholder="给你的作品起个名字..."
                value={publishTitle}
                onChange={(e) => setPublishTitle(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">作品描述（可选）</label>
              <textarea
                placeholder="分享创作思路或故事..."
                value={publishDescription}
                onChange={(e) => setPublishDescription(e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePublish} disabled={publishing || !publishTitle.trim()}>
              {publishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  发布中...
                </>
              ) : (
                "发布"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* P1-4: 导入到项目对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>导入到项目</DialogTitle>
            <DialogDescription>
              将生成的视频导入到项目中的某一集
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">选择项目</label>
              <Select value={selectedProjectId} onValueChange={handleSelectProject}>
                <SelectTrigger>
                  <SelectValue placeholder="请选择项目..." />
                </SelectTrigger>
                <SelectContent>
                  {importProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">选择集</label>
              {importLoadingEpisodes ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={selectedEpisodeId}
                  onValueChange={setSelectedEpisodeId}
                  disabled={!selectedProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="请选择集..." />
                  </SelectTrigger>
                  <SelectContent>
                    {importEpisodes.map((ep) => (
                      <SelectItem key={ep.id} value={ep.id}>
                        {ep.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleImportToProject}
              disabled={importing || !selectedEpisodeId}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  导入中...
                </>
              ) : (
                "导入"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 保存模板对话框 */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为模板</DialogTitle>
            <DialogDescription>
              将当前参数保存为模板，方便下次快速使用
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">模板名称</label>
              <input
                type="text"
                placeholder="例如：电影级人像特写"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">模板描述（可选）</label>
              <textarea
                placeholder="描述这个模板的用途或特点..."
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">将保存以下参数：</p>
              <ul className="space-y-0.5">
                <li>• 提示词：{prompt.slice(0, 50)}{prompt.length > 50 ? "..." : ""}</li>
                <li>• 模型：{selectedModel?.name}</li>
                <li>• 比例：{aspectRatio}</li>
                <li>• 时长：{duration}秒</li>
                {seed && <li>• 种子：{seed}</li>}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTemplate} disabled={savingTemplate || !templateName.trim()}>
              {savingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
