"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Sparkles, Video, Play, Eye } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";
import { VideoDetailSheet } from "@/components/community/VideoDetailSheet";

interface CommunityPost {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  description?: string;
  likes_count: number;
  views_count: number;
  created_at: string;
  generation_tasks: {
    video_url: string;
    thumbnail_url?: string;
    prompt: string;
  };
  profiles: {
    username?: string;
    avatar_url?: string;
  };
}

function formatViews(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days}天前`;
  if (days < 30) return `${Math.floor(days / 7)}周前`;
  return date.toLocaleDateString("zh-CN");
}

function AvatarFallback({ username, avatarUrl }: { username: string; avatarUrl?: string }) {
  const initials = username.slice(0, 1).toUpperCase();
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className="h-8 w-8 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="h-8 w-8 rounded-full bg-brand-cyan/20 flex items-center justify-center text-xs font-bold text-brand-cyan shrink-0">
      {initials}
    </div>
  );
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [total, setTotal] = useState(0);

  const [leaderboard, setLeaderboard] = useState<CommunityPost[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = (post: CommunityPost) => {
    setSelectedPost(post);
    setSheetOpen(true);
  };

  const fetchPosts = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/community/list?sort=${sort}&limit=20`);
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
        setTotal(data.total ?? 0);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await apiFetch("/api/community/leaderboard");
      const data = await res.json();
      if (data.top_posts) {
        setLeaderboard(data.top_posts);
      }
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchLeaderboard();
  }, [fetchPosts, fetchLeaderboard]);

  const handleLike = async (postId: string) => {
    try {
      const res = await apiFetch("/api/community/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "操作失败");
        return;
      }

      const { liked, likes_count } = await res.json();

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes_count } : post
        )
      );

      // 同步更新 leaderboard 中的点赞数
      setLeaderboard((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes_count } : post
        )
      );

      toast.success(liked ? "已点赞" : "已取消点赞");
    } catch {
      toast.error("网络错误");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">社区</h1>
        <p className="text-sm text-muted-foreground mt-1">
          发现优秀创作者的作品，获取灵感
        </p>
      </div>

      {/* 区块一：赛博风热力榜单 */}
      {(!leaderboardLoading || leaderboard.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold mb-4">
            🔥 热力榜单
          </h2>

          {leaderboardLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? null : (
            <div className="space-y-3">
              {leaderboard.map((post, index) => (
                <Card
                  key={post.id}
                  className="border-brand-cyan/20 hover:border-brand-gold/50 transition-all"
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* 排名徽章 */}
                    <div className="text-2xl font-bold w-8 text-center shrink-0">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}
                    </div>

                    {/* 作者信息 */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        @{post.profiles.username ?? "匿名用户"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        《{post.title}》
                      </p>
                    </div>

                    {/* 播放量 + 获赞 */}
                    <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {formatViews(post.views_count)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {formatViews(post.likes_count)}
                      </span>
                    </div>

                    {/* 播放按钮 */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => openSheet(post as CommunityPost)}
                    >
                      ▶ 播放
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 区块二：信息流卡片 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            📺 创作者分享{total > 0 ? ` (${total})` : ""}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={sort === "latest" ? "default" : "outline"}
              onClick={() => setSort("latest")}
            >
              最新
            </Button>
            <Button
              size="sm"
              variant={sort === "popular" ? "default" : "outline"}
              onClick={() => setSort("popular")}
            >
              热门
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 p-4 pb-0">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  </div>
                  <div className="px-4 pt-3">
                    <Skeleton className="aspect-[9/16] w-full rounded-lg" />
                  </div>
                  <div className="p-4">
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Video className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-foreground font-medium">暂无作品</p>
              <p className="text-sm text-muted-foreground mt-1">
                生成视频后可以发布到社区分享
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const username = post.profiles.username ?? "匿名用户";
              return (
                <Card
                  key={post.id}
                  className="overflow-hidden hover:border-brand-gold/30 transition-colors"
                >
                  <CardContent className="p-0">
                    {/* 头部: 头像 + 用户名 + 时间 */}
                    <div className="flex items-center gap-3 p-4 pb-0">
                      <AvatarFallback
                        username={username}
                        avatarUrl={post.profiles.avatar_url}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">@{username}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(post.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* 正文 */}
                    {post.description && (
                      <p className="px-4 pt-3 text-sm line-clamp-3">
                        {post.description}
                      </p>
                    )}

                    {/* 视频缩略图 - 9:16 竖屏 */}
                    <div className="px-4 pt-3">
                      <div
                        className="relative aspect-[9/16] bg-muted rounded-lg overflow-hidden cursor-pointer group"
                        onClick={() => openSheet(post)}
                      >
                        {post.generation_tasks.thumbnail_url ? (
                          <img
                            src={post.generation_tasks.thumbnail_url}
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* hover 播放覆盖层 */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="rounded-full bg-white/90 p-3">
                            <Play className="h-6 w-6 text-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className="flex items-center gap-4 p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors ${
                            post.likes_count > 0 ? "fill-red-500 text-red-500" : ""
                          }`}
                        />
                        <span>{formatViews(post.likes_count)}</span>
                      </Button>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {formatViews(post.views_count)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 提示卡片 */}
      <Card className="border-dashed">
        <CardContent className="text-center py-12">
          <Sparkles className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-medium">分享你的作品</p>
          <p className="text-sm text-muted-foreground mt-1">
            在生成页面点击&ldquo;发布到社区&rdquo;按钮，让更多人看到你的创作
          </p>
        </CardContent>
      </Card>

      {/* 视频详情弹窗 */}
      <VideoDetailSheet
        post={selectedPost}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
