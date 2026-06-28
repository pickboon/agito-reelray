"use client";

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Film, Camera, Coins, Users, TrendingUp, Clapperboard } from "lucide-react";

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

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const templates =
    activeCategory === "all"
      ? getAllTemplates()
      : getTemplatesByCategory(activeCategory);

  function openDetail(t: StoreTemplate) {
    setSelectedTemplate(t);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">模板商店</h1>
          <p className="text-sm text-muted-foreground mt-1">
            精选短剧模板，一键导入开始创作
          </p>
        </div>
        <Badge variant="outline" className="text-brand-cyan border-brand-cyan/30">
          {getAllTemplates().length} 套模板
        </Badge>
      </div>

      {/* 分类筛选 */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={activeCategory === cat.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat.key)}
            className={
              activeCategory === cat.key
                ? "bg-brand-gold text-primary-foreground hover:bg-brand-gold/80"
                : ""
            }
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {/* 模板卡片网格 */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {templates.map((t) => (
          <Card
            key={t.id}
            className="cursor-pointer hover:ring-brand-gold/40 transition-all duration-200"
            onClick={() => openDetail(t)}
          >
            <CardContent className="flex gap-4">
              {/* 封面 emoji */}
              <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-3xl">
                {t.cover_emoji}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* 名称 + 价格 */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {t.name}
                  </h3>
                  <span className="text-brand-gold font-bold text-base flex-shrink-0">
                    {formatPrice(t.price_cents)}
                  </span>
                </div>

                {/* 标签 */}
                <div className="flex flex-wrap gap-1">
                  {t.tags.slice(0, 4).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* 描述截断 */}
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {t.description}
                </p>

                {/* 统计行 */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Film className="h-3 w-3" />
                    {t.total_scenes} 场景
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="h-3 w-3" />
                    {t.total_shots} 镜头
                  </span>
                  <span className="flex items-center gap-1">
                    <Coins className="h-3 w-3" />
                    {t.estimated_credits.toLocaleString()} Credits
                  </span>
                </div>
              </div>
            </CardContent>

            {/* 底部购买按钮 */}
            <div className="px-4 pb-4 pt-1">
              <Button disabled size="sm" className="w-full">
                即将上线
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 模板详情 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
          {selectedTemplate && (
            <>
              <DialogHeader className="p-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-2xl flex-shrink-0">
                    {selectedTemplate.cover_emoji}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-lg">
                      {selectedTemplate.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      {selectedTemplate.tags.join(" · ")}
                    </DialogDescription>
                  </div>
                  <span className="ml-auto text-brand-gold font-bold text-lg flex-shrink-0">
                    {formatPrice(selectedTemplate.price_cents)}
                  </span>
                </div>
              </DialogHeader>

              <Separator />

              <ScrollArea className="flex-1 max-h-[60vh] px-4 pb-4">
                <div className="space-y-5">
                  {/* 描述 */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedTemplate.description}
                  </p>

                  {/* 统计概览 */}
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox
                      icon={<Film className="h-4 w-4 text-brand-gold" />}
                      label="场景"
                      value={`${selectedTemplate.total_scenes}`}
                    />
                    <StatBox
                      icon={<Camera className="h-4 w-4 text-brand-cyan" />}
                      label="镜头"
                      value={`${selectedTemplate.total_shots}`}
                    />
                    <StatBox
                      icon={<Coins className="h-4 w-4 text-brand-gold" />}
                      label="预估 Credits"
                      value={`${(selectedTemplate.estimated_credits / 1000).toFixed(0)}K`}
                    />
                  </div>

                  <Separator />

                  {/* 场景列表 */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Clapperboard className="h-4 w-4 text-brand-cyan" />
                      场景列表
                    </h4>
                    <div className="space-y-2">
                      {selectedTemplate.scenes.map((scene) => (
                        <div
                          key={scene.scene_number}
                          className="rounded-lg border border-border bg-secondary/30 p-3"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">
                              <span className="text-brand-gold mr-1.5">
                                {String(scene.scene_number).padStart(2, "0")}
                              </span>
                              {scene.title}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {scene.shots.length} 镜头
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {scene.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 角色列表 */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-brand-cyan" />
                      角色设定
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedTemplate.characters.map((char) => (
                        <div
                          key={char.name}
                          className="rounded-lg border border-border bg-secondary/30 p-3"
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-xs text-muted-foreground">
                              {char.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {char.name}
                              </p>
                              <p
                                className={`text-[10px] font-medium ${ROLE_COLORS[char.role] ?? "text-muted-foreground"}`}
                              >
                                {ROLE_LABELS[char.role] ?? char.role}
                              </p>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                            {char.traits}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 情绪曲线 */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-brand-cyan" />
                      情绪曲线
                    </h4>
                    <div className="flex items-end gap-2 h-24 px-1">
                      {selectedTemplate.emotion_graph.map((val, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${(val / 5) * 100}%`,
                              background: `linear-gradient(to top, #00F0FF, #FACC15)`,
                              opacity: 0.7 + (val / 5) * 0.3,
                            }}
                          />
                          <span className="text-[9px] text-muted-foreground">
                            S{i + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <Separator />

              {/* 底部操作 */}
              <div className="p-4 pt-3">
                <Button disabled className="w-full bg-brand-gold text-primary-foreground">
                  导入此模板 — 即将上线
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 flex flex-col items-center gap-0.5">
      {icon}
      <span className="text-base font-semibold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
