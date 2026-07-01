"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("modern");
  const [language, setLanguage] = useState("en");

  function resetForm() {
    setTitle("");
    setDescription("");
    setTemplate("modern");
    setLanguage("en");
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    const supabase = createClient();

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      toast.error("未登录，请先登录");
      setCreating(false);
      return;
    }

    // 1. 创建项目
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        template_id: template,
        target_languages: [language],
      })
      .select("id")
      .single();

    if (error) {
      console.error("[CreateProjectDialog]", error);
      toast.error(`创建失败: ${error.message}`);
      setCreating(false);
      return;
    }

    // 2. 自动创建第一集
    const { data: episode, error: epError } = await supabase
      .from("episodes")
      .insert({
        project_id: project.id,
        episode_number: 1,
        title: "第1集",
        status: "draft",
      })
      .select("id")
      .single();

    if (epError) {
      console.error("[CreateProjectDialog] episode error:", epError);
      toast.error(`项目已创建，但创建集数失败: ${epError.message}`);
    }

    toast.success(`项目「${title.trim()}」已创建`);
    onOpenChange(false);
    resetForm();

    // 3. 跳转到编辑器
    if (episode && !epError) {
      router.push(`/dashboard/projects/${project.id}/episodes/${episode.id}`);
    } else {
      router.push(`/dashboard/projects/${project.id}`);
    }
    setCreating(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>创建新项目</DialogTitle>
          <DialogDescription>
            开始一个新的短剧项目，设置角色并生成一致性视频。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cpd-title">项目名称</Label>
            <Input
              id="cpd-title"
              placeholder="例如：都市恋人之逆袭"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={creating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpd-desc">描述（可选）</Label>
            <Textarea
              id="cpd-desc"
              placeholder="简要描述项目内容..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={creating}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>模板风格</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v ?? "modern")} disabled={creating}>
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
              <Select value={language} onValueChange={(v) => setLanguage(v ?? "en")} disabled={creating}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={creating || !title.trim()}>
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
  );
}
