"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Film, Clock, Loader2 } from "lucide-react";

interface Project {
  id: string;
  title: string;
  status: string;
  template_id: string | null;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTemplate, setNewTemplate] = useState("modern");
  const [newLanguage, setNewLanguage] = useState("en");

  async function fetchProjects() {
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("projects")
      .select("id, title, status, template_id, updated_at")
      .order("updated_at", { ascending: false });

    if (err) {
      setError("加载项目失败");
    } else {
      setProjects((data ?? []) as Project[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleCreateProject() {
    if (!newTitle.trim()) return;
    setCreating(true);
    const supabase = createClient();
    
    // 获取当前用户
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      alert("未登录，请先登录");
      setCreating(false);
      return;
    }
    
    const { error: err } = await supabase.from("projects").insert({
      user_id: user.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      template_id: newTemplate,
      target_languages: [newLanguage],
    });

    if (err) {
      console.error("[Create Project]", err);
      alert(`创建失败: ${err.message}\n\n代码: ${err.code}`);
    } else {
      setProjects((prev) => [
        {
          id: crypto.randomUUID(),
          title: newTitle.trim(),
          status: "draft",
          template_id: newTemplate,
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewTemplate("modern");
      setNewLanguage("en");
    }
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">管理你的短剧项目</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Film className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-foreground font-medium">还没有项目</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              创建你的第一个短剧项目
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
            >
              <Card className="h-full hover:border-brand-gold/30 transition-colors cursor-pointer">
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-brand-gold" />
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">
                        {project.title}
                      </h3>
                    </div>
                    <Badge
                      variant={
                        project.status === "active" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {project.status}
                    </Badge>
                  </div>
                  {project.template_id && (
                    <Badge variant="outline" className="text-xs">
                      {project.template_id}
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(project.updated_at).toLocaleDateString("zh-CN")}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* 创建项目对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>创建新项目</DialogTitle>
            <DialogDescription>
              开始一个新的短剧项目，设置角色并生成一致性视频。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-title">项目名称</Label>
              <Input
                id="project-title"
                placeholder="例如：都市恋人之逆袭"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-desc">描述（可选）</Label>
              <Textarea
                id="project-desc"
                placeholder="简要描述项目内容..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                disabled={creating}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模板风格</Label>
                <Select value={newTemplate} onValueChange={(v) => setNewTemplate(v ?? "modern")} disabled={creating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">现代都市</SelectItem>
                    <SelectItem value="romance">甜宠言情</SelectItem>
                    <SelectItem value="thriller">悬疑惊悚</SelectItem>
                    <SelectItem value="comedy">轻松喜剧</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标语言</Label>
                <Select value={newLanguage} onValueChange={(v) => setNewLanguage(v ?? "en")} disabled={creating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
              取消
            </Button>
            <Button onClick={handleCreateProject} disabled={creating || !newTitle.trim()}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  创建项目
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
