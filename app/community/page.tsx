"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Heart, MessageCircle, TrendingUp, Sparkles, Video, Play } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

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

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [total, setTotal] = useState(0);

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

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      
      // 更新本地状态
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, likes_count } : post
        )
      );

      toast.success(liked ? "已点赞" : "已取消点赞");
    } catch {
      toast.error("网络错误");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    return date.toLocaleDateString("zh-CN");
  };

  return (
    <div className="space-y-8">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">社区</h1>
          <p className="text-sm text-muted-foreground mt-1">
            发现优秀创作者的作品，获取灵感
          </p>
        </div>
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

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: "创作者", value: "1,200+" },
          { icon: Heart, label: "总点赞", value: "50K+" },
          { icon: MessageCircle, label: "评论", value: "8,000+" },
          { icon: TrendingUp, label: "本周新增", value: "120+" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gold/10">
                <stat.icon className="h-5 w-5 text-brand-gold" />
              </div>
              <div>
                <p className="text-lg font-semibold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 精选作品 */}
      <section>
        <h2 className="text-lg font-semibold mb-4">
          {sort === "latest" ? "最新作品" : "热门作品"} ({total})
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden hover:border-brand-gold/30 transition-colors"
              >
                <CardContent className="p-0">
                  {/* 视频预览 */}
                  <div className="aspect-video bg-muted relative">
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
                    {post.generation_tasks.video_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <a
                          href={post.generation_tasks.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 hover:bg-white transition-colors"
                        >
                          <Play className="h-5 w-5 text-foreground ml-0.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium text-sm line-clamp-2 mb-1">
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {post.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{post.profiles.username ?? "匿名用户"}</span>
                        <span>•</span>
                        <span>{formatDate(post.created_at)}</span>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => handleLike(post.id)}
                      >
                        <Heart className="h-4 w-4" />
                        <span>{post.likes_count}</span>
                      </Button>
                    </div>

                    {post.generation_tasks.prompt && (
                      <Badge variant="outline" className="text-xs">
                        {post.generation_tasks.prompt.slice(0, 50)}
                        {post.generation_tasks.prompt.length > 50 ? "..." : ""}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
}
