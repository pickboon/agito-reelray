"use client";

import { useEffect, useState, use, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Users, Film, ArrowLeft, Anchor, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

interface Project {
  id: string;
  title: string;
  status: string;
  template_id?: string;
  description: string;
  created_at: string;
}

interface Character {
  id: string;
  name: string;
  description: string;
  reference_image_url: string | null;
  anchor_image_url?: string | null;
  anchor_status?: string | null;
}

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  status: string;
  created_at: string;
}

const anchorStatusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "待生成", variant: "outline" },
  generating: { label: "生成中", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  failed: { label: "失败", variant: "destructive" },
};

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorLoading, setAnchorLoading] = useState<Record<string, boolean>>({});

  // Character dialog
  const [charDialogOpen, setCharDialogOpen] = useState(false);
  const [charCreating, setCharCreating] = useState(false);
  const [charName, setCharName] = useState("");
  const [charDescription, setCharDescription] = useState("");
  const [charImageUrl, setCharImageUrl] = useState("");

  // Episode dialog
  const [epDialogOpen, setEpDialogOpen] = useState(false);
  const [epCreating, setEpCreating] = useState(false);
  const [epTitle, setEpTitle] = useState("");

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [projectRes, charsRes, epsRes] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("characters").select("*").eq("project_id", id),
      supabase
        .from("episodes")
        .select("*")
        .eq("project_id", id)
        .order("episode_number", { ascending: true }),
    ]);

    if (projectRes.error) {
      setError("加载项目失败");
      setLoading(false);
      return;
    }

    setProject(projectRes.data as Project);
    setCharacters((charsRes.data ?? []) as Character[]);
    setEpisodes((epsRes.data ?? []) as Episode[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCharacter = async () => {
    if (!charName.trim()) return;
    setCharCreating(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("characters").insert({
      project_id: id,
      name: charName.trim(),
      description: charDescription.trim(),
      reference_image_url: charImageUrl.trim() || null,
    });

    if (err) {
      console.error("[Create Character]", err);
      toast.error(`创建角色失败: ${err.message}`);
    } else {
      // 直接追加到本地列表，避免 fetchData 触发 loading skeleton 导致对话框卸载
      setCharacters((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: charName.trim(),
          description: charDescription.trim(),
          reference_image_url: charImageUrl.trim() || null,
          anchor_image_url: null,
          anchor_status: "pending",
        },
      ]);
      setCharDialogOpen(false);
      setCharName("");
      setCharDescription("");
      setCharImageUrl("");
    }
    setCharCreating(false);
  };

  const handleCreateEpisode = async () => {
    if (!epTitle.trim()) return;
    setEpCreating(true);
    const supabase = createClient();

    // 自动计算下一集编号
    const nextNumber = episodes.length > 0
      ? Math.max(...episodes.map((e) => e.episode_number)) + 1
      : 1;

    const { error: err } = await supabase.from("episodes").insert({
      project_id: id,
      episode_number: nextNumber,
      title: epTitle.trim(),
    });

    if (err) {
      console.error("[Create Episode]", err);
      toast.error(`创建集失败: ${err.message}`);
    } else {
      setEpisodes((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: epTitle.trim(),
          episode_number: nextNumber,
          status: "draft",
          created_at: new Date().toISOString(),
        },
      ]);
      setEpDialogOpen(false);
      setEpTitle("");
    }
    setEpCreating(false);
  };

  const handleGenerateAnchor = async (characterId: string) => {
    setAnchorLoading((prev) => ({ ...prev, [characterId]: true }));
    try {
      const res = await apiFetch("/api/engine/generate-anchor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "锚点图生成失败");
      }
      await fetchData();
    } catch {
      toast.error("请求失败，请重试");
    } finally {
      setAnchorLoading((prev) => ({ ...prev, [characterId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error ?? "项目不存在"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/projects"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回项目列表
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground">
            {project.title}
          </h1>
          <Badge
            variant={project.status === "active" ? "default" : "secondary"}
          >
            {project.status}
          </Badge>
          {project.template_id && (
            <Badge variant="outline">{project.template_id}</Badge>
          )}
        </div>
        {project.description && (
          <p className="text-sm text-muted-foreground mt-2">
            {project.description}
          </p>
        )}
      </div>

      {/* Characters */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-cyan" />
            Characters
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCharDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Character
          </Button>
        </div>
        {characters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">暂无角色</p>
              <Button size="sm" variant="outline" className="gap-1.5 mt-3" onClick={() => setCharDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Character
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((char) => {
              const aStatus = char.anchor_status ?? "pending";
              const statusInfo = anchorStatusBadge[aStatus] ?? anchorStatusBadge.pending;
              const isLoading = anchorLoading[char.id] ?? false;

              return (
                <Card key={char.id}>
                  <CardContent className="flex items-start gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-cyan/10">
                      <Users className="h-5 w-5 text-brand-cyan" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {char.name}
                        </p>
                        <Badge variant={statusInfo.variant} className="text-[10px] px-1.5">
                          {statusInfo.label}
                        </Badge>
                      </div>
                      {char.description && (
                        <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
                          {char.description}
                        </p>
                      )}

                      {char.anchor_image_url && (
                        <div className="mt-2">
                          <video
                            src={char.anchor_image_url}
                            className="w-full h-16 object-cover rounded"
                            muted
                            playsInline
                          />
                        </div>
                      )}

                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 h-6 text-xs w-full"
                          disabled={isLoading || aStatus === "generating" || !char.reference_image_url}
                          onClick={() => handleGenerateAnchor(char.id)}
                        >
                          {isLoading || aStatus === "generating" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Anchor className="h-3 w-3" />
                          )}
                          {aStatus === "completed" ? "重新生成锚点" : "生成锚点"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Episodes */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Film className="h-4 w-4 text-brand-gold" />
            Episodes
          </h2>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEpDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Episode
          </Button>
        </div>
        {episodes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <Film className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">暂无集</p>
              <Button size="sm" variant="outline" className="gap-1.5 mt-3" onClick={() => setEpDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New Episode
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                href={`/dashboard/projects/${id}/episodes/${ep.id}`}
              >
                <Card className="hover:border-brand-gold/30 transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-gold/10 text-xs font-medium text-brand-gold">
                        {ep.episode_number}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {ep.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ep.created_at).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        ep.status === "completed" ? "default" : "secondary"
                      }
                    >
                      {ep.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Add Character Dialog */}
      <Dialog open={charDialogOpen} onOpenChange={setCharDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>添加角色</DialogTitle>
            <DialogDescription>
              为项目添加一个新角色，上传参考图后可生成锚点。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="char-name">角色名称</Label>
              <Input
                id="char-name"
                placeholder="例如：林小雨"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                disabled={charCreating}
              />
            </div>
            <div className="space-y-2">
            </div>
            <div className="space-y-2">
              <Label htmlFor="char-desc">角色描述</Label>
              <Textarea
                id="char-desc"
                placeholder="外貌、性格、服装等描述..."
                value={charDescription}
                onChange={(e) => setCharDescription(e.target.value)}
                disabled={charCreating}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="char-img">参考图片 URL（可选）</Label>
              <Input
                id="char-img"
                placeholder="https://..."
                value={charImageUrl}
                onChange={(e) => setCharImageUrl(e.target.value)}
                disabled={charCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCharDialogOpen(false)} disabled={charCreating}>
              取消
            </Button>
            <Button onClick={handleCreateCharacter} disabled={charCreating || !charName.trim()}>
              {charCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  添加角色
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Episode Dialog */}
      <Dialog open={epDialogOpen} onOpenChange={setEpDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>新建集</DialogTitle>
            <DialogDescription>
              添加新一集，集数自动递增（下一集为第 {episodes.length + 1} 集）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ep-title">集标题</Label>
              <Input
                id="ep-title"
                placeholder={`例如：第 ${episodes.length + 1} 集 - 初遇`}
                value={epTitle}
                onChange={(e) => setEpTitle(e.target.value)}
                disabled={epCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEpDialogOpen(false)} disabled={epCreating}>
              取消
            </Button>
            <Button onClick={handleCreateEpisode} disabled={epCreating || !epTitle.trim()}>
              {epCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  新建集
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
