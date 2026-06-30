"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import Image from "next/image";
import { Play, Heart, Eye, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface VideoDetailSheetProps {
  post: {
    id: string;
    title: string;
    description?: string;
    likes_count: number;
    views_count: number;
    created_at: string;
    generation_tasks: {
      video_url: string;
      thumbnail_url?: string;
      prompt?: string;
      model_id?: string;
      mode?: string;
      aspect_ratio?: string;
      duration?: number;
    };
    profiles: {
      username?: string;
      avatar_url?: string;
    };
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

export function VideoDetailSheet({ post, open, onOpenChange }: VideoDetailSheetProps) {
  const router = useRouter();

  if (!post) return null;

  const username = post.profiles.username ?? "匿名用户";
  const initials = username.slice(0, 1).toUpperCase();

  // P1-5: 以此创建项目 - 跳转到生成页并预填参数
  const handleUseAsTemplate = () => {
    const task = post.generation_tasks;
    const params = new URLSearchParams();
    if (task.prompt) params.set("prompt", task.prompt);
    if (task.model_id) params.set("model", task.model_id);
    if (task.mode) params.set("mode", task.mode);
    if (task.aspect_ratio) params.set("aspect_ratio", task.aspect_ratio);
    if (task.duration) params.set("duration", String(task.duration));
    router.push(`/dashboard/generate?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] max-w-[600px] sm:max-w-[600px] p-0 overflow-y-auto"
      >
        {/* 视频区 */}
        <div className="bg-black aspect-[9/16] flex items-center justify-center relative">
          {post.generation_tasks.video_url ? (
            <video
              key={post.id}
              src={post.generation_tasks.video_url}
              controls
              autoPlay
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Play className="h-12 w-12" />
              <span className="text-sm">视频暂不可用</span>
            </div>
          )}
        </div>

        {/* 信息区 */}
        <div className="p-4 space-y-3">
          <h3 className="text-lg font-semibold">{post.title}</h3>

          <div className="flex items-center gap-2">
            {post.profiles.avatar_url ? (
              <Image
          src={post.profiles.avatar_url}
          alt={username}
          width=32
          height=32
          className="rounded-full object-cover"
        />
            ) : (
              <div className="h-8 w-8 rounded-full bg-brand-cyan/20 flex items-center justify-center text-xs font-bold text-brand-cyan">
                {initials}
              </div>
            )}
            <span className="text-sm">@{username}</span>
          </div>

          {post.description && (
            <p className="text-sm text-muted-foreground">{post.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {formatViews(post.views_count)} 播放
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {formatViews(post.likes_count)} 获赞
            </span>
          </div>

          {/* P1-5: 操作按钮 */}
          {post.generation_tasks.prompt && (
            <div className="pt-3 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleUseAsTemplate}
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                以此创建项目
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
