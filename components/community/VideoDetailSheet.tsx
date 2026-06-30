"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Play, Heart, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  if (!post) return null;

  const username = post.profiles.username ?? "匿名用户";
  const initials = username.slice(0, 1).toUpperCase();

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
              <img
                src={post.profiles.avatar_url}
                alt={username}
                className="h-8 w-8 rounded-full object-cover"
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
