"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Clapperboard,
  Sparkles,
  Play,
  Clock,
  Coins,
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { ShotDrawer } from "@/components/ShotDrawer";

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  status: string;
  project_id: string;
}

interface Shot {
  id: string;
  shot_number: number;
  prompt: string;
  status: string;
  reference_character_id?: string | null;
  elapsed_seconds: number | null;
  credits_consumed: number | null;
  video_url: string | null;
}

interface Character {
  id: string;
  name: string;
  role?: string;
  anchor_image_url?: string | null;
  anchor_status?: string | null;
}

const statusIcon: Record<string, string> = {
  pending: "⏳",
  submitted: "🔄",
  processing: "⚙️",
  completed: "✅",
  failed: "❌",
  needs_review: "⚠️",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "待处理" },
  { value: "submitted", label: "已提交" },
  { value: "processing", label: "处理中" },
  { value: "completed", label: "已完成" },
  { value: "failed", label: "失败" },
  { value: "needs_review", label: "待审核" },
];

export default function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; ep: string }>;
}) {
  const { id, ep } = use(params);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

  // CRUD 状态
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [newCharacterId, setNewCharacterId] = useState("");
  const [saving, setSaving] = useState(false);

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedShots, setSelectedShots] = useState<Set<string>>(new Set());
  const [drawerShotId, setDrawerShotId] = useState<string | null>(null);

  // 批量生成状态
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ total: number; current: number; completed: number; failed: number } | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const [epRes, shotsRes] = await Promise.all([
      supabase.from("episodes").select("*").eq("id", ep).single(),
      supabase
        .from("shots")
        .select("*")
        .eq("episode_id", ep)
        .order("shot_number", { ascending: true }),
    ]);

    if (epRes.error) {
      setError("加载集详情失败");
      setLoading(false);
      return;
    }

    const epData = epRes.data as Episode;
    setEpisode(epData);
    setShots((shotsRes.data ?? []) as Shot[]);

    const { data: charsData } = await supabase
      .from("characters")
      .select("*")
      .eq("project_id", epData.project_id);

    setCharacters((charsData ?? []) as Character[]);
    setLoading(false);
  }, [ep]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleChar = (charId: string) => {
    setSelectedChars((prev) =>
      prev.includes(charId) ? prev.filter((c) => c !== charId) : [...prev, charId]
    );
  };

  // 创建镜头
  const handleCreateShot = async () => {
    if (!newPrompt.trim()) {
      toast.error("请输入提示词");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/shots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episode_id: ep,
          prompt: newPrompt.trim(),
          reference_character_id: newCharacterId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "创建失败");
        return;
      }

      const shot = await res.json();
      setShots((prev) => [...prev, shot]);
      toast.success("镜头创建成功");
      setAddDialogOpen(false);
      setNewPrompt("");
      setNewCharacterId("");
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  // 编辑镜头
  const handleEditShot = (shot: Shot) => {
    setDrawerShotId(shot.id);
  };

  const handleUpdateShot = async () => {
    if (!editingShot || !newPrompt.trim()) return;

    setSaving(true);
    try {
      const res = await apiFetch(`/api/shots/${editingShot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newPrompt.trim(),
          reference_character_id: newCharacterId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "更新失败");
        return;
      }

      const updated = await res.json();
      setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success("镜头更新成功");
      setEditDialogOpen(false);
      setEditingShot(null);
      setNewPrompt("");
      setNewCharacterId("");
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  };

  // 删除镜头
  const handleDeleteShot = async (shotId: string) => {
    if (!confirm("确定删除此镜头？")) return;

    try {
      const res = await apiFetch(`/api/shots/${shotId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "删除失败");
        return;
      }

      setShots((prev) => prev.filter((s) => s.id !== shotId));
      toast.success("镜头已删除");
    } catch {
      toast.error("网络错误");
    }
  };

  // 更新状态
  const handleStatusChange = async (shotId: string, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/shots/${shotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "更新失败");
        return;
      }

      const updated = await res.json();
      setShots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast.success("状态已更新");
    } catch {
      toast.error("网络错误");
    }
  };

  // 批量选择
  const toggleShotSelection = (shotId: string) => {
    setSelectedShots((prev) => {
      const next = new Set(prev);
      if (next.has(shotId)) {
        next.delete(shotId);
      } else {
        next.add(shotId);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedShots(new Set(shots.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedShots(new Set());
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedShots.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedShots.size} 个镜头？`)) return;

    try {
      const res = await apiFetch("/api/shots/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shot_ids: Array.from(selectedShots),
          action: "delete",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "批量删除失败");
        return;
      }

      setShots((prev) => prev.filter((s) => !selectedShots.has(s.id)));
      setSelectedShots(new Set());
      toast.success(`已删除 ${selectedShots.size} 个镜头`);
      setBatchMode(false);
    } catch {
      toast.error("网络错误");
    }
  };

  // 批量更新状态
  const handleBatchStatusUpdate = async (status: string) => {
    if (selectedShots.size === 0) return;

    try {
      const res = await apiFetch("/api/shots/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shot_ids: Array.from(selectedShots),
          action: "update_status",
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "批量更新失败");
        return;
      }

      setShots((prev) =>
        prev.map((s) =>
          selectedShots.has(s.id) ? { ...s, status, updated_at: new Date().toISOString() } : s
        )
      );
      setSelectedShots(new Set());
      toast.success(`已更新 ${selectedShots.size} 个镜头状态`);
      setBatchMode(false);
    } catch {
      toast.error("网络错误");
    }
  };

  // 批量生成处理
  const handleBatchGenerate = async () => {
    const pendingShots = shots.filter((s) => s.status === "pending");
    if (pendingShots.length === 0) {
      toast.error("没有待处理的镜头");
      return;
    }

    setBatchGenerating(true);
    setBatchProgress({ total: pendingShots.length, current: 0, completed: 0, failed: 0 });

    try {
      // 预检查批量任务
      const batchRes = await apiFetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot_ids: pendingShots.map((s) => s.id) }),
      });

      if (!batchRes.ok) {
        const data = await batchRes.json();
        toast.error(data.error || "批量生成失败");
        setBatchGenerating(false);
        setBatchProgress(null);
        return;
      }

      // 逐个调用生成 API（间隔 500ms）
      for (let i = 0; i < pendingShots.length; i++) {
        const shot = pendingShots[i];
        setBatchProgress((prev) => prev ? { ...prev, current: i + 1 } : null);

        try {
          const res = await apiFetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shot_id: shot.id,
              mode: "t2v",
              prompt: shot.prompt,
            }),
          });

          if (!res.ok) {
            const data = await res.json();
            console.error(`Shot ${shot.id} generation failed:`, data.error);
            setBatchProgress((prev) => prev ? { ...prev, failed: prev.failed + 1 } : null);
          } else {
            setBatchProgress((prev) => prev ? { ...prev, completed: prev.completed + 1 } : null);
            // 更新本地状态
            setShots((prev) =>
              prev.map((s) => (s.id === shot.id ? { ...s, status: "submitted" } : s))
            );
          }
        } catch (error) {
          console.error(`Shot ${shot.id} generation error:`, error);
          setBatchProgress((prev) => prev ? { ...prev, failed: prev.failed + 1 } : null);
        }

        // 间隔 500ms（最后一个不需要等待）
        if (i < pendingShots.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      toast.success(`批量生成完成：成功 ${batchProgress?.completed ?? 0} 个，失败 ${batchProgress?.failed ?? 0} 个`);
      setBatchGenerating(false);
      setTimeout(() => setBatchProgress(null), 3000);
    } catch (error) {
      console.error("Batch generation error:", error);
      toast.error("批量生成失败");
      setBatchGenerating(false);
      setBatchProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error ?? "集不存在"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回项目
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground">
            {episode.title}
          </h1>
          <Badge
            variant={episode.status === "completed" ? "default" : "secondary"}
          >
            {episode.status}
          </Badge>
        </div>
      </div>

      {/* 角色选择器 */}
      <section className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-cyan" />
            角色选择
          </h3>
          <Button
            size="sm"
            variant={multiMode ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => {
              setMultiMode((prev) => !prev);
              if (!multiMode) setSelectedChars([]);
            }}
          >
            {multiMode ? "多角色模式" : "单角色模式"}
          </Button>
        </div>

        {characters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {characters.map((char) => {
              const isSelected = selectedChars.includes(char.id);
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    if (!multiMode) {
                      setSelectedChars(isSelected ? [] : [char.id]);
                    } else {
                      toggleChar(char.id);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                      : "border-border bg-background text-foreground hover:border-muted-foreground"
                  }`}
                >
                  {char.anchor_image_url ? (
                    <img
                      src={char.anchor_image_url}
                      alt={char.name}
                      className="h-5 w-5 rounded object-cover"
                    />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span>{char.name}</span>
                  {isSelected && <Badge className="h-4 px-1 text-[9px]">✓</Badge>}
                </button>
              );
            })}
          </div>
        )}

        {multiMode && selectedChars.length > 1 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">排列预览：</p>
            <div className="flex gap-1 overflow-x-auto">
              {selectedChars.map((charId, i) => {
                const char = characters.find((c) => c.id === charId);
                return (
                  <div key={charId} className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded bg-brand-cyan/10 flex items-center justify-center">
                      {char?.anchor_image_url ? (
                        <img
                          src={char.anchor_image_url}
                          alt={char?.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-brand-cyan" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {i + 1}. {char?.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Shot 列表 */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clapperboard className="h-4 w-4 text-brand-gold" />
                Shots ({shots.length})
              </h2>
              {batchMode && (
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={selectAll}>
                    全选
                  </Button>
                  <Button size="sm" variant="outline" onClick={deselectAll}>
                    取消全选
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={batchMode ? "default" : "outline"}
                onClick={() => {
                  setBatchMode(!batchMode);
                  setSelectedShots(new Set());
                }}
              >
                {batchMode ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 mr-1" />
                    批量模式
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5 mr-1" />
                    批量操作
                  </>
                )}
              </Button>
              <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                添加镜头
              </Button>
            </div>
          </div>

          {/* 批量操作工具栏 */}
          {batchMode && selectedShots.size > 0 && (
            <Card className="border-brand-gold/30 bg-brand-gold/5">
              <CardContent className="flex items-center justify-between py-3">
                <span className="text-sm text-foreground">
                  已选择 {selectedShots.size} 个镜头
                </span>
                <div className="flex items-center gap-2">
                  <Select onValueChange={(v: string | null) => { if (v) handleBatchStatusUpdate(v); }}>
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue placeholder="批量更新状态" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBatchDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    批量删除
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {shots.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clapperboard className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">暂无镜头</p>
                <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  添加第一个镜头
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {shots.map((shot) => (
                <Card
                  key={shot.id}
                  className={`transition-colors ${
                    batchMode && selectedShots.has(shot.id)
                      ? "border-brand-gold bg-brand-gold/5"
                      : "hover:border-brand-gold/30"
                  }`}
                >
                  <CardContent className="flex items-center gap-4 py-3">
                    {batchMode && (
                      <Checkbox
                        checked={selectedShots.has(shot.id)}
                        onCheckedChange={() => toggleShotSelection(shot.id)}
                      />
                    )}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-medium text-foreground">
                      {shot.shot_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-1">
                        {shot.prompt || "无提示词"}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {shot.elapsed_seconds != null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {shot.elapsed_seconds}s
                          </span>
                        )}
                        {shot.credits_consumed != null && (
                          <span className="flex items-center gap-1">
                            <Coins className="h-3 w-3" />
                            {shot.credits_consumed.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={shot.status}
                        onValueChange={(value) => value && handleStatusChange(shot.id, value)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{statusIcon[shot.status] ?? "❓"}</span>
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!batchMode && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleEditShot(shot)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteShot(shot.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 智能助手侧边栏 */}
        <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
          <SheetTrigger
            render={
              <button className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold text-background shadow-lg hover:bg-brand-gold/90 transition-colors md:relative md:bottom-auto md:right-auto md:h-auto md:w-auto md:rounded-lg md:px-4 md:py-2 md:shadow-none">
                <Sparkles className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline text-sm font-medium">
                  AI 助手
                </span>
              </button>
            }
          />
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>AI 助手</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground text-center">
                智能助手功能开发中…
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 底部操作栏 */}
      <div className="space-y-3 border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={shots.filter((s) => s.status === "pending").length === 0 || batchGenerating}
            onClick={handleBatchGenerate}
          >
            {batchGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate All Pending
              </>
            )}
          </Button>
          <Link href={`/dashboard/editor/${ep}`}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Clapperboard className="h-4 w-4" />
              打开编辑器
            </Button>
          </Link>
        </div>

        {/* 批量生成进度条 */}
        {batchProgress && (
          <Card className="border-brand-gold/30 bg-brand-gold/5">
            <CardContent className="py-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">
                    批量生成进度
                  </span>
                  <span className="text-muted-foreground">
                    {batchProgress.current} / {batchProgress.total}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-gold transition-all duration-300"
                    style={{
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>成功: {batchProgress.completed}</span>
                  <span>失败: {batchProgress.failed}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 添加镜头对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加镜头</DialogTitle>
            <DialogDescription>
              为当前集添加一个新的镜头，输入提示词和关联角色。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">提示词</label>
              <Textarea
                placeholder="描述这个镜头的画面内容..."
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">关联角色（可选）</label>
              <Select value={newCharacterId} onValueChange={(v) => setNewCharacterId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无</SelectItem>
                  {characters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateShot} disabled={saving || !newPrompt.trim()}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* C4 全息属性抽屉 — 替代独立 Shot Detail 页 */}
      <ShotDrawer
        open={drawerShotId !== null}
        onOpenChange={(open) => { if (!open) setDrawerShotId(null); }}
        shotId={drawerShotId}
        projectId={id}
        episodeId={ep}
        onShotUpdated={fetchData}
      />

</div>
  );
}
