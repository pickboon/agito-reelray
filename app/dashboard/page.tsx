"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Film, Clapperboard, Wallet, TrendingUp, ArrowRight, Sparkles } from "lucide-react";

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

/** 数字跳动动画 — 从 0 缓动到 target */
function CountUp({ target, duration = 800, formatter }: { target: number; duration?: number; formatter?: (n: number) => string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return <>{formatter ? formatter(display) : display.toLocaleString()}</>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" style={{ animation: "skeleton-breathe 2s ease-in-out infinite" }} />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" style={{ animation: "skeleton-breathe 2s ease-in-out infinite" }} />
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

  // P2-2: projectCount === 0 时显示欢迎引导
  if (stats && stats.projectCount === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">项目概览与快捷操作</p>
        </div>

        {/* 欢迎引导卡片 */}
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
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md btn-primary text-sm font-medium"
            >
              创建第一个项目
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        {/* 快捷引导 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="py-6 text-center">
              <Film className="h-5 w-5 text-brand-gold mx-auto mb-2" />
              <p className="text-sm font-medium">步骤 1</p>
              <p className="text-xs text-muted-foreground mt-1">创建项目并选择模板</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Clapperboard className="h-5 w-5 text-brand-cyan mx-auto mb-2" />
              <p className="text-sm font-medium">步骤 2</p>
              <p className="text-xs text-muted-foreground mt-1">上传角色参考照片</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Sparkles className="h-5 w-5 text-brand-gold mx-auto mb-2" />
              <p className="text-sm font-medium">步骤 3</p>
              <p className="text-xs text-muted-foreground mt-1">生成一致性视频片段</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-hud-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">项目概览与快捷操作</p>
      </div>

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
    </div>
  );
}