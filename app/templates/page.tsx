"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getAllTemplates,
  type StoreTemplate,
} from "@/lib/templates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Film, Trash2, Share2, Search, Play, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

// ── 分类导航 ──
const SIDEBAR_CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "revenge", label: "复仇逆袭" },
  { key: "romance", label: "甜宠恋爱" },
  { key: "thriller", label: "悬疑惊悚" },
  { key: "fantasy", label: "古风仙侠" },
  { key: "ceo", label: "霸总契约" },
  { key: "warlord", label: "战神归来" },
  { key: "comeback", label: "逆袭女王" },
  { key: "crossworld", label: "穿越时空" },
] as const;

const TOP_FILTERS = [
  { key: "all", label: "全部" },
  { key: "revenge", label: "复仇" },
  { key: "romance", label: "恋爱" },
  { key: "thriller", label: "悬疑" },
  { key: "fantasy", label: "仙侠" },
] as const;

// ── 视频映射 (模板id → demo文件名) ──
const VIDEO_MAP: Record<string, string> = {
  revenge: "revenge_boardroom.mp4",
  romance: "romance_cafe.mp4",
  thriller: "thriller_room.mp4",
  fantasy: "fantasy_trial.mp4",
  crossworld: "crossworld_portal.mp4",
  ceo: "ceo_office.mp4",
  warlord: "warlord_return.mp4",
  comeback: "comeback_villa.mp4",
};

// ── 类型定义 ──
type TemplateSource = "store" | "user" | "market";

interface UnifiedItem {
  id: string;
  name: string;
  description: string;
  source: TemplateSource;
  category: string;
  tags: string[];
  estimatedCredits?: number;
  totalScenes?: number;
  coverEmoji?: string;
  useCount?: number;
  isPublic?: boolean;
  username?: string;
  storeTemplate?: StoreTemplate;
}

interface UserTemplate {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  model_id: string;
  mode: string;
  aspect_ratio: string;
  duration: number;
  seed?: number;
  is_public: boolean;
  use_count: number;
  created_at: string;
}

interface MarketTemplate {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  model_id: string;
  mode: string;
  aspect_ratio: string;
  duration: number;
  seed?: number;
  use_count: number;
  created_at: string;
  profiles: {
    username?: string;
    avatar_url?: string;
  };
}

const ROLE_LABELS: Record<string, string> = {
  protagonist: "主角",
  antagonist: "反派",
  ally: "盟友",
  rival: "对手",
};

const ROLE_COLORS: Record<string, string> = {
  protagonist: "text-brand-gold",
  antagonist: "text-red-400",
  ally: "text-brand-cyan",
  rival: "text-purple-400",
};

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [marketTemplates, setMarketTemplates] = useState<MarketTemplate[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const allStoreTemplates = getAllTemplates();

  // 合并三种来源为统一列表
  const unifiedList: UnifiedItem[] = [
    ...allStoreTemplates.map((t): UnifiedItem => ({
      id: t.id,
      name: t.name,
      description: t.description,
      source: "store",
      category: t.category,
      tags: t.tags,
      estimatedCredits: t.estimated_credits,
      totalScenes: t.total_scenes,
      coverEmoji: t.cover_emoji,
      storeTemplate: t,
    })),
    ...userTemplates.map((t): UnifiedItem => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      source: "user",
      category: "",
      tags: [],
      useCount: t.use_count,
      isPublic: t.is_public,
    })),
    ...marketTemplates.map((t): UnifiedItem => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      source: "market",
      category: "",
      tags: [],
      useCount: t.use_count,
      username: t.profiles.username,
    })),
  ];

  // 过滤逻辑
  const filtered = unifiedList.filter((item) => {
    if (activeCategory !== "all") {
      if (item.source === "store") {
        const mainCategories = ["revenge", "romance", "thriller", "fantasy"];
        if (mainCategories.includes(activeCategory)) {
          if (item.category !== activeCategory) return false;
        } else if (item.id !== activeCategory) {
          return false;
        }
      } else {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  // 分类计数 (仅官方模板)
  const getCategoryCount = (key: string): number => {
    if (key === "all") return allStoreTemplates.length;
    const mainCategories = ["revenge", "romance", "thriller", "fantasy"];
    if (mainCategories.includes(key)) {
      return allStoreTemplates.filter((t) => t.category === key).length;
    }
    return allStoreTemplates.filter((t) => t.id === key).length;
  };

  const fetchUserTemplates = useCallback(async () => {
    try {
      const res = await apiFetch("/api/templates/user");
      const data = await res.json();
      setUserTemplates(data.templates ?? []);
    } catch (error) {
      console.error("Failed to fetch user templates:", error);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  const fetchMarketTemplates = useCallback(async () => {
    try {
      const res = await apiFetch("/api/templates/market?limit=10");
      const data = await res.json();
      setMarketTemplates(data.templates ?? []);
    } catch (error) {
      console.error("Failed to fetch market templates:", error);
    } finally {
      setLoadingMarket(false);
    }
  }, []);

  useEffect(() => {
    fetchUserTemplates();
    fetchMarketTemplates();
  }, [fetchUserTemplates, fetchMarketTemplates]);

  function openDetail(t: StoreTemplate) {
    setSelectedTemplate(t);
    setDialogOpen(true);
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("确定删除此模板？")) return;

    try {
      const res = await apiFetch(`/api/templates/user?id=${templateId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error("删除失败");
        return;
      }

      setUserTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success("模板已删除");
    } catch {
      toast.error("网络错误");
    }
  };

  const handlePublishTemplate = async (templateId: string) => {
    try {
      const res = await apiFetch("/api/templates/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, is_public: true }),
      });

      if (!res.ok) {
        toast.error("发布失败");
        return;
      }

      setUserTemplates((prev) =>
        prev.map((t) => (t.id === templateId ? { ...t, is_public: true } : t))
      );
      toast.success("已发布到模板市场");
    } catch {
      toast.error("网络错误");
    }
  };

  const isLoading = loadingUser || loadingMarket;

  return (
    <div className="space-y-4">
      {/* 顶部工具栏：分类标签 + 搜索 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {TOP_FILTERS.map((cat) => (
            <Button
              key={cat.key}
              variant={activeCategory === cat.key ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
        <div className="relative w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索模板、风格关键词…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-9 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 主体：左侧导航 + 右侧网格 */}
      <div className="flex gap-6">
        {/* 左侧分类导航 */}
        <aside className="w-[200px] shrink-0 hidden md:block">
          <nav className="space-y-0.5 sticky top-20">
            {SIDEBAR_CATEGORIES.map((cat) => {
              const count = getCategoryCount(cat.key);
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors text-left ${
                    isActive
                      ? "bg-brand-cyan/10 text-brand-cyan font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* 右侧卡片网格 */}
        <main className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[340px] rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Film className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? `未找到与"${searchQuery}"匹配的模板`
                  : "当前分类暂无模板"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => (
                <UnifiedCard
                  key={`${item.source}-${item.id}`}
                  item={item}
                  onOpenDetail={openDetail}
                  onPublish={handlePublishTemplate}
                  onDelete={handleDeleteTemplate}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 官方模板详情弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3">
                <Badge>{selectedTemplate.category}</Badge>
                <Badge variant="outline">{selectedTemplate.total_scenes} 场景</Badge>
                <Badge variant="secondary">
                  {Math.round(selectedTemplate.estimated_credits / 100)} 积分
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">角色设定</h4>
                <div className="space-y-2">
                  {selectedTemplate.characters.map((char) => (
                    <div
                      key={char.name}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className={`font-medium ${ROLE_COLORS[char.role] ?? ""}`}>
                        {ROLE_LABELS[char.role] ?? char.role}
                      </span>
                      <span className="text-muted-foreground">—</span>
                      <span>{char.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">场景提示</h4>
                <ScrollArea className="h-32 rounded border border-border p-3">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {selectedTemplate.scenes?.map(s => s.description).join('\n\n') ?? "无场景描述"}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 统一卡片组件 ──
function UnifiedCard({
  item,
  onOpenDetail,
  onPublish,
  onDelete,
}: {
  item: UnifiedItem;
  onOpenDetail: (t: StoreTemplate) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = VIDEO_MAP[item.id];

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const creditsDisplay =
    item.source === "store" && item.estimatedCredits != null
      ? `${Math.round(item.estimatedCredits / 100)} 积分`
      : item.useCount != null
        ? `使用 ${item.useCount} 次`
        : null;

  const sourceBadge =
    item.source === "store" ? (
      <Badge variant="default" className="text-xs">官方</Badge>
    ) : item.source === "user" ? (
      <Badge variant="secondary" className="text-xs">我的</Badge>
    ) : (
      <Badge variant="outline" className="text-xs">社区</Badge>
    );

  return (
    <Card
      className={`card-hover-lift overflow-hidden transition-colors ${
        item.source === "store"
          ? "cursor-pointer hover:border-brand-purple/30"
          : item.source === "user" && item.isPublic
            ? "border-brand-gold/20"
            : ""
      }`}
      onClick={item.source === "store" && item.storeTemplate ? () => onOpenDetail(item.storeTemplate!) : undefined}
    >
      {/* 视频预览区 */}
      <div
        className="relative aspect-[9/16] max-h-[360px] w-full bg-card flex items-center justify-center overflow-hidden"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            src={`/demos/${videoSrc}`}
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl select-none">{item.coverEmoji || "🎬"}</span>
        )}
        <div className="absolute top-2 right-2">
          <div className="h-6 w-6 rounded-full bg-black/40 flex items-center justify-center">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        {/* 标题 */}
        <h3 className="text-sm font-medium line-clamp-1">{item.name}</h3>

        {/* 标签行 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {sourceBadge}
          {item.source === "store" && item.category && (
            <Badge variant="outline" className="text-xs">{item.category}</Badge>
          )}
        </div>

        {/* 底部信息 */}
        {creditsDisplay && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{creditsDisplay}</span>
            {item.source === "store" && item.totalScenes != null && (
              <span>{item.totalScenes} 场景</span>
            )}
          </div>
        )}

        {/* 用户模板操作按钮 */}
        {item.source === "user" && (
          <div className="flex items-center gap-2 pt-1">
            {!item.isPublic && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onPublish(item.id);
                }}
              >
                <Share2 className="h-3 w-3 mr-1" />
                发布
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              删除
            </Button>
          </div>
        )}

        {/* 市场模板作者 */}
        {item.source === "market" && item.username && (
          <p className="text-xs text-muted-foreground">
            by {item.username}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
