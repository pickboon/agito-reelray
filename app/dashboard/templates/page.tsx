"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAllTemplates,
  getTemplatesByCategory,
  type StoreTemplate,
} from "@/lib/templates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Film, Camera, Coins, Users, TrendingUp, Clapperboard, Trash2, Share2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-fetch";

const CATEGORIES = [
  { key: "all", label: "全部" },
  { key: "revenge", label: "复仇" },
  { key: "romance", label: "恋爱" },
  { key: "thriller", label: "悬疑" },
  { key: "fantasy", label: "仙侠" },
] as const;

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

function formatPrice(cents: number): string {
  return `¥${(cents / 100).toFixed(0)}`;
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

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [marketTemplates, setMarketTemplates] = useState<MarketTemplate[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMarket, setLoadingMarket] = useState(true);

  const storeTemplates =
    activeCategory === "all"
      ? getAllTemplates()
      : getTemplatesByCategory(activeCategory);

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

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">模板商店</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理你的模板，发现社区精选模板
          </p>
        </div>
        <Badge variant="outline" className="text-brand-cyan border-brand-cyan/30">
          {getAllTemplates().length} 套官方模板
        </Badge>
      </div>

      {/* 我的模板 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-gold" />
          我的模板 ({userTemplates.length})
        </h2>

        {loadingUser ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : userTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                还没有保存的模板，在生成页面点击"保存为模板"开始收藏
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map((template) => (
              <Card
                key={template.id}
                className={`hover:border-brand-gold/30 transition-colors ${
                  template.is_public ? "border-brand-gold/20" : ""
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm line-clamp-1">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                    {template.is_public && (
                      <Badge variant="outline" className="text-xs ml-2 shrink-0">
                        公开
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{template.aspect_ratio}</Badge>
                    <span>{template.duration}s</span>
                    <span>•</span>
                    <span>使用 {template.use_count} 次</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {!template.is_public && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePublishTemplate(template.id)}
                      >
                        <Share2 className="h-3.5 w-3.5 mr-1" />
                        发布
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* 模板市场 */}
      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-cyan" />
          模板市场 ({marketTemplates.length})
        </h2>

        {loadingMarket ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : marketTemplates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                模板市场暂无作品，发布你的模板成为第一批创作者
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketTemplates.map((template) => (
              <Card
                key={template.id}
                className="hover:border-brand-cyan/30 transition-colors"
              >
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-medium text-sm line-clamp-1">
                      {template.name}
                    </h3>
                    {template.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {template.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{template.aspect_ratio}</Badge>
                    <span>{template.duration}s</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <span>by {template.profiles.username ?? "匿名用户"}</span>
                    <span>使用 {template.use_count} 次</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* 官方模板商店 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Film className="h-4 w-4 text-brand-gold" />
            官方精选模板
          </h2>
        </div>

        {/* 分类筛选 */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {CATEGORIES.map((cat) => (
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {storeTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-brand-gold/30 transition-colors"
              onClick={() => openDetail(template)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-sm line-clamp-2">
                    {template.name}
                  </h3>
                  <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                    {formatPrice(template.price_cents)}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{template.category}</Badge>
                  <span>{template.total_scenes} 集</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 详情对话框 */}
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
                  {formatPrice(selectedTemplate.price_cents)}
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
