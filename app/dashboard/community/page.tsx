"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, MessageCircle, TrendingUp, Sparkles } from "lucide-react";

// 模拟社区作品数据
const SHOWCASE_ITEMS = [
  {
    id: "1",
    title: "《重生复仇：总裁夫人不好惹》",
    author: "创作者A",
    genre: "复仇",
    episodes: 12,
    likes: 328,
    views: 2100,
    thumbnail: null,
  },
  {
    id: "2",
    title: "《甜蜜陷阱：暗恋成婚》",
    author: "创作者B",
    genre: "恋爱",
    episodes: 8,
    likes: 256,
    views: 1800,
    thumbnail: null,
  },
  {
    id: "3",
    title: "《密室逃脱：第七感》",
    author: "创作者C",
    genre: "悬疑",
    episodes: 6,
    likes: 189,
    views: 1500,
    thumbnail: null,
  },
  {
    id: "4",
    title: "《仙途：逆天改命》",
    author: "创作者D",
    genre: "仙侠",
    episodes: 15,
    likes: 412,
    views: 3200,
    thumbnail: null,
  },
];

export default function CommunityPage() {
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
        <Button disabled>
          <Sparkles className="h-4 w-4 mr-2" />
          发布作品
        </Button>
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
        <h2 className="text-lg font-semibold mb-4">精选作品</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHOWCASE_ITEMS.map((item) => (
            <Card
              key={item.id}
              className="cursor-pointer hover:border-brand-gold/30 transition-colors"
            >
              <CardContent className="flex gap-4 py-4">
                <div className="w-24 h-32 shrink-0 bg-muted rounded flex items-center justify-center">
                  <span className="text-2xl">🎬</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-2 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    by {item.author}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">{item.genre}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.episodes} 集
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {item.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.views}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 即将上线提示 */}
      <Card className="border-dashed">
        <CardContent className="text-center py-12">
          <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-foreground font-medium">社区功能即将上线</p>
          <p className="text-sm text-muted-foreground mt-1">
            点赞、评论、关注创作者等功能正在开发中
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
