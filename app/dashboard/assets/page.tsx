"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Trash2,
  Upload,
  Video,
  Image as ImageIcon,
  Clock,
  Filter,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

interface Asset {
  id: string;
  type: "video" | "image";
  source: "ai_generated" | "uploaded";
  title: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  size_bytes?: number;
  created_at: string;
  model_id?: string;
}

export default function AssetsPage() {
  const supabase = createClient();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<"all" | "ai_generated" | "uploaded">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "video" | "image">("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // P2-2: 用于项目对话框
  const [useInProjectOpen, setUseInProjectOpen] = useState(false);
  const [useInAsset, setUseInAsset] = useState<Asset | null>(null);
  const [useInProjects, setUseInProjects] = useState<Array<{ id: string; title: string }>>([]);
  const [useInEpisodes, setUseInEpisodes] = useState<Array<{ id: string; title: string }>>([]);
  const [useInProject, setUseInProject] = useState("");
  const [useInEpisode, setUseInEpisode] = useState("");
  const [useInPrompt, setUseInPrompt] = useState("");
  const [useInSubmitting, setUseInSubmitting] = useState(false);

  useEffect(() => {
    if (!useInProjectOpen) return;
    async function loadProjects() {
      const s = createClient();
      const { data } = await s.from("projects").select("id, title").order("updated_at", { ascending: false });
      if (data) setUseInProjects(data as Array<{ id: string; title: string }>);
    }
    loadProjects();
  }, [useInProjectOpen]);

  useEffect(() => {
    if (!useInProject) {
      setUseInEpisodes([]);
      setUseInEpisode("");
      return;
    }
    async function loadEpisodes() {
      const s = createClient();
      const { data } = await s
        .from("episodes")
        .select("id, title")
        .eq("project_id", useInProject)
        .order("episode_number", { ascending: true });
      if (data) setUseInEpisodes(data as Array<{ id: string; title: string }>);
    }
    loadEpisodes();
  }, [useInProject]);

  function openUseInProject(asset: Asset) {
    setUseInAsset(asset);
    setUseInProjectOpen(true);
    setUseInProject("");
    setUseInEpisode("");
    setUseInPrompt("");
  }

  async function handleUseInProject() {
    if (!useInAsset || !useInEpisode || !useInPrompt.trim()) return;
    setUseInSubmitting(true);
    try {
      const res = await apiFetch("/api/generation/create", {
        method: "POST",
        json: {
          model_id: "happyhorse-1.1",
          prompt: useInPrompt.trim(),
          mode: "r2v",
          reference_image_url: useInAsset.url,
          aspect_ratio: "9:16",
          duration: 5,
          project_id: useInProject,
          episode_id: useInEpisode,
        },
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "提交失败");
        return;
      }
      toast.success("已提交到项目渲染队列");
      setUseInProjectOpen(false);
    } catch {
      toast.error("网络错误");
    } finally {
      setUseInSubmitting(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, []);

  async function fetchAssets() {
    setLoading(true);
    try {
      const { data: tasks, error } = await supabase
        .from("generation_tasks")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch tasks:", error);
        return;
      }

      const videoAssets: Asset[] = (tasks ?? []).map((task) => ({
        id: task.id,
        type: "video" as const,
        source: "ai_generated" as const,
        title: task.prompt.slice(0, 50) + (task.prompt.length > 50 ? "..." : ""),
        url: task.video_url,
        thumbnail_url: task.thumbnail_url,
        duration: task.duration,
        created_at: task.created_at,
        model_id: task.model_id,
      }));

      setAssets(videoAssets);
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  }

  // P1-5: 资产上传
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast.error("文件大小不能超过 100MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "asset");

      const res = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "上传失败");
        return;
      }

      const data = await res.json();
      const newAsset: Asset = {
        id: data.url || crypto.randomUUID(),
        type: file.type.startsWith("video") ? "video" : "image",
        source: "uploaded",
        title: file.name,
        url: data.url,
        size_bytes: file.size,
        created_at: new Date().toISOString(),
      };

      setAssets((prev) => [newAsset, ...prev]);
      toast.success("上传成功");
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // P1-6: 资产删除
  async function handleDelete(asset: Asset) {
    if (asset.source === "ai_generated") {
      // 删除生成任务（含 FK 检查）
      try {
        const res = await apiFetch(`/api/generation/delete?task_id=${asset.id}`, {
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
            `/api/generation/delete?task_id=${asset.id}&confirm=true`,
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

        setAssets((prev) => prev.filter((a) => a.id !== asset.id));
        toast.success("已删除");
      } catch {
        toast.error("网络错误");
      }
    } else {
      // 上传的文件 — 从列表中移除（实际 R2 文件清理需要后台任务）
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("已从列表移除");
    }
  }

  async function handleDownload(asset: Asset) {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = `${asset.type}-${asset.id}.mp4`;
    a.click();
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredAssets = assets.filter((asset) => {
    if (sourceFilter !== "all" && asset.source !== sourceFilter) return false;
    if (typeFilter !== "all" && asset.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">我的资产</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你生成和上传的媒体文件</p>
        </div>

        {/* P1-5: 上传按钮 */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                上传文件
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={sourceFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("all")}
          >
            全部
          </Button>
          <Button
            variant={sourceFilter === "ai_generated" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("ai_generated")}
          >
            AI 生成
          </Button>
          <Button
            variant={sourceFilter === "uploaded" ? "default" : "outline"}
            size="sm"
            onClick={() => setSourceFilter("uploaded")}
          >
            上传
          </Button>
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as "all" | "video" | "image")}>
          <SelectTrigger className="w-32">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="video">视频</SelectItem>
            <SelectItem value="image">图片</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 资产网格 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-video w-full" />
          ))}
        </div>
      ) : filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Video className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-foreground font-medium">暂无资产</p>
            <p className="text-sm text-muted-foreground mt-1">
              生成视频或上传文件后会自动显示在这里
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="overflow-hidden group cursor-pointer">
              <div className="aspect-video bg-muted relative">
                {asset.thumbnail_url ? (
                  <Image
          src={asset.thumbnail_url}
          alt={asset.title}
          fill
          className="w-full h-full object-cover"
        />
                ) : asset.type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}

                {/* 悬停操作 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(asset)} title="下载">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openUseInProject(asset)}
                    title="用于项目"
                  >
                    <ImagePlus className="h-4 w-4 text-brand-cyan" />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDelete(asset)}
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>

                {/* 来源标记 */}
                {asset.source === "uploaded" && (
                  <Badge className="absolute top-2 left-2 bg-blue-500/80 text-white text-xs">
                    上传
                  </Badge>
                )}

                {/* 时长 */}
                {asset.duration && (
                  <Badge className="absolute top-2 right-2 bg-black/70 text-white">
                    {asset.duration}s
                  </Badge>
                )}
              </div>

              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-medium line-clamp-2">{asset.title}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(asset.created_at)}</span>
                  </div>
                  {asset.model_id && (
                    <Badge variant="outline" className="text-xs">
                      {asset.model_id}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* P2-2: 用于项目对话框 */}
      <Dialog open={useInProjectOpen} onOpenChange={setUseInProjectOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>将资产用于项目</DialogTitle>
            <DialogDescription>
              选择目标项目和集，以该资产为参考图创建渲染任务。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>选择项目</Label>
              <Select value={useInProject} onValueChange={(v) => { setUseInProject(v ?? ""); setUseInEpisode(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {useInProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>选择集</Label>
              <Select value={useInEpisode} onValueChange={(v) => setUseInEpisode(v ?? "")} disabled={!useInProject}>
                <SelectTrigger>
                  <SelectValue placeholder="选择集" />
                </SelectTrigger>
                <SelectContent>
                  {useInEpisodes.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="usein-prompt">提示词</Label>
              <Input
                id="usein-prompt"
                placeholder="描述生成视频的画面内容..."
                value={useInPrompt}
                onChange={(e) => setUseInPrompt(e.target.value)}
                disabled={useInSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseInProjectOpen(false)} disabled={useInSubmitting}>
              取消
            </Button>
            <Button
              onClick={handleUseInProject}
              disabled={useInSubmitting || !useInEpisode || !useInPrompt.trim()}
            >
              {useInSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                "提交渲染"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
