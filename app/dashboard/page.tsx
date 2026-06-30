"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TemplatePreviewDialog } from "@/components/community/TemplatePreviewDialog";
import {
  Film,
  Clapperboard,
  Wallet,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Zap,
  FlaskConical,
  LayoutTemplate,
} from "lucide-react";
import HowItWorksBanner from "@/components/HowItWorksBanner";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";

interface DashboardStats {
  projectCount: number;
  episodeCount: number;
  creditsRemaining: number;
  plan: string;
}

interface RecentProject {
  id: string;
  title: string;
  status: string;
  template_id: string | null;
  updated_at: string;
}

const statusMap: Record<string, string> = {
  draft: "草稿",
  generating: "生成中",
  completed: "已完成",
};

/** 数字跳动动画 — 进入视口后从 0 缓动到 target */
function CountUp({ target, duration = 800, formatter }: { target: number; duration?: number; formatter?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const elRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  // IntersectionObserver — 进入视口才触发
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 数字缓动动画
  useEffect(() => {
    if (!started) return;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, started]);

  return <span ref={elRef}>{formatter ? formatter(display) : display.toLocaleString()}</span>;
}

const quickLinks = [
  { href: "/dashboard/forge", label: "资产锻造", desc: "角色/滤镜/配音", icon: Sparkles, color: "gold" as const },
  { href: "/dashboard/generate", label: "灵感沙盒", desc: "快速生成试验", icon: FlaskConical, color: "cyan" as const },
];

const templates = [
  { key: "revenge", emoji: "🗡️", name: "复仇重生", desc: "逆袭打脸爽剧" },
  { key: "romance", emoji: "💕", name: "甜宠虐恋", desc: "甜虐交织恋爱" },
  { key: "thriller", emoji: "🔍", name: "悬疑惊悚", desc: "烧脑反转推理" },
  { key: "fantasy", emoji: "🧚", name: "穿越仙侠", desc: "修仙奇幻冒险" },
];

interface PreviewTemplate {
  preset: string;
  name: string;
  emoji: string;
  desc: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 模板预览弹窗 state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<PreviewTemplate | null>(null);
  const [applyLoading, setApplyLoading] = useState(false);

  // P2-1: 新建项目弹窗
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      // 先确保 session 已就绪（登录后 cookie 可能还未写入）
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("未登录");
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      const [projectsRes, subRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, title, status, template_id, updated_at, episodes(count)")
          .order("updated_at", { ascending: false })
          .limit(5),
        supabase
          .from("subscriptions")
          .select("credits_remaining, plan")
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle(),
      ]);

      if (projectsRes.error) {
        console.error("[Dashboard] projects fetch error:", projectsRes.error);
        setError("加载项目失败");
        setLoading(false);
        return;
      }

      const data = projectsRes.data ?? [];
      const epCount = data.reduce((sum, p) => {
        const episodes = (p as Record<string, unknown>).episodes as { count: number }[] | undefined;
        return sum + (episodes?.[0]?.count ?? 0);
      }, 0);

      setStats({
        projectCount: data.length,
        episodeCount: epCount,
        creditsRemaining: subRes.data?.credits_remaining ?? 0,
        plan: subRes.data?.plan ?? "free",
      });
      setProjects(data as unknown as RecentProject[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleApplyTemplate() {
    if (!previewTemplate) return;
    setApplyLoading(true);
    try {
      const res = await apiFetch("/api/templates/apply", {
        method: "POST",
        json: { preset: previewTemplate.preset },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "创建项目失败");
        return;
      }
      toast.success(`已使用「${previewTemplate.name}」模板创建新项目`);
      setPreviewOpen(false);
      router.push(`/dashboard/projects/${data.project_id}/episodes/${data.episode_id}`);
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setApplyLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  const planDisplay = (stats?.plan ?? "free").charAt(0).toUpperCase() + (stats?.plan ?? "free").slice(1);

  const statCards = [
    {
      label: "项目数",
      number: stats?.projectCount ?? 0,
      icon: Film,
      color: "text-brand-gold",
      format: undefined as ((n: number) => string) | undefined,
    },
    {
      label: "集数",
      number: stats?.episodeCount ?? 0,
      icon: Clapperboard,
      color: "text-brand-cyan",
      format: undefined as ((n: number) => string) | undefined,
    },
    {
      label: "Credits",
      number: stats?.creditsRemaining ?? 0,
      icon: Wallet,
      color: "text-brand-gold",
      format: (n: number) => n.toLocaleString(),
    },
    {
      label: "套餐",
      text: planDisplay,
      icon: TrendingUp,
      color: "text-brand-cyan",
    },
  ] as const;

  const isEmpty = stats && stats.projectCount === 0;

  return (
    <div className="space-y-8 animate-hud-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">项目概览与创作中枢</p>
      </div>

      {/* B4 工作原理 Banner */}
      <HowItWorksBanner />

      {/* 4 指标卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label} className="frosted-card card-hover-lift">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {'number' in card ? (
                  <CountUp target={card.number} formatter={card.format} />
                ) : (
                  card.text
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 空项目欢迎引导 */}
      {isEmpty && (
        <Card className="border-brand-gold/30 bg-brand-gold/5">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="h-14 w-14 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-brand-gold" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              欢迎使用 ReelRay！
            </h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              创建你的第一个项目，上传角色照片，开始生成一致性短剧视频。
            </p>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md btn-primary text-sm font-medium"
            >
              创建第一个项目
              <ArrowRight className="h-4 w-4" />
            </button>
          </CardContent>
        </Card>
      )}

      {/* 独立大 CTA */}
      <div
        className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-gold/20 via-brand-gold/10 to-transparent border border-brand-gold/30 cursor-pointer transition-all hover:border-brand-gold/50 hover:shadow-[0_0_24px_-4px_rgba(230,195,94,0.25)]"
        onClick={() => setCreateDialogOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCreateDialogOpen(true); }}
      >
        <div className="flex items-center justify-between px-6 py-8 sm:py-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
              🎬 创建新项目
            </h2>
            <p className="text-sm text-muted-foreground">
              选择模板，开始你的短剧之旅
            </p>
          </div>
          <ArrowRight className="h-6 w-6 text-brand-gold transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Bento 双栏区 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 左：推荐模板 — 点击打开预览弹窗 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <LayoutTemplate className="h-4 w-4 text-brand-cyan" />
              推荐模板
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {templates.map((t) => (
                <div
                  key={t.key}
                  className="flex flex-col items-center justify-center p-3 rounded-lg bg-brand-gold/5 hover:border-brand-gold/30 border border-transparent transition-colors cursor-pointer card-hover-lift"
                  onClick={() => {
                    setPreviewTemplate({ preset: t.key, name: t.name, emoji: t.emoji, desc: t.desc });
                    setPreviewOpen(true);
                  }}
                >
                  <span className="text-2xl mb-1">{t.emoji}</span>
                  <p className="text-sm font-medium text-foreground text-center">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground text-center">{t.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 右：快速开始 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Zap className="h-4 w-4 text-brand-gold" />
              快速开始
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-2">
            {quickLinks.map((link) => {
              const borderClass = link.color === "gold" ? "hover:border-brand-gold/30" : "hover:border-brand-cyan/30";
              const iconBg = link.color === "gold" ? "bg-brand-gold/10" : "bg-brand-cyan/10";
              const iconColor = link.color === "gold" ? "text-brand-gold" : "text-brand-cyan";
              return (
                <Link key={link.href} href={link.href}>
                  <div className={`flex items-center gap-3 h-[54px] px-3 rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur hover:bg-white/[0.06] ${borderClass} transition-colors cursor-pointer`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${iconBg}`}>
                      <link.icon className={`h-4 w-4 ${iconColor}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{link.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{link.desc}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* 最近项目列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">最近项目</h2>
          <Link
            href="/dashboard/projects"
            className="flex items-center gap-1 text-sm text-brand-gold hover:text-brand-gold/80 transition-colors"
          >
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Film className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">暂无项目</p>
              <Link
                href="/dashboard/projects"
                className="mt-3 text-sm text-brand-gold hover:underline"
              >
                创建第一个项目
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
                <Card className="card-hover-lift transition-colors cursor-pointer hover:border-l-2 hover:border-l-brand-cyan">
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Film className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {project.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {project.template_id ?? "自定义"} ·{" "}
                          {new Date(project.updated_at).toLocaleDateString("zh-CN")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">
                      {statusMap[project.status] ?? project.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 模板预览弹窗 */}
      {previewTemplate && (
        <TemplatePreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          templateName={previewTemplate.name}
          templateDesc={previewTemplate.desc}
          templateEmoji={previewTemplate.emoji}
          presetKey={previewTemplate.preset}
          onApply={handleApplyTemplate}
          loading={applyLoading}
        />
      )}
      {/* P2-1: 新建项目对话框 */}
      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
