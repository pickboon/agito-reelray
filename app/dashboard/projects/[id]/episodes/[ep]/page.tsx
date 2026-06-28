"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Clapperboard,
  Sparkles,
  Download,
  Play,
  Clock,
  Coins,
} from "lucide-react";

interface Episode {
  id: string;
  title: string;
  episode_number: number;
  status: string;
  project_id: string;
}

interface Shot {
  id: string;
  shot_number: number;
  prompt: string;
  status: string;
  elapsed_seconds: number | null;
  credits_consumed: number | null;
  video_url: string | null;
}

const statusIcon: Record<string, string> = {
  pending: "⏳",
  submitted: "🔄",
  processing: "⚙️",
  completed: "✅",
  failed: "❌",
};

export default function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; ep: string }>;
}) {
  const { id, ep } = use(params);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const [epRes, shotsRes] = await Promise.all([
        supabase.from("episodes").select("*").eq("id", ep).single(),
        supabase
          .from("shots")
          .select("*")
          .eq("episode_id", ep)
          .order("shot_number", { ascending: true }),
      ]);

      if (epRes.error) {
        setError("加载集详情失败");
        setLoading(false);
        return;
      }

      setEpisode(epRes.data as Episode);
      setShots((shotsRes.data ?? []) as Shot[]);
      setLoading(false);
    }
    fetchData();
  }, [ep]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error ?? "集不存在"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回项目
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground">
            {episode.title}
          </h1>
          <Badge
            variant={episode.status === "completed" ? "default" : "secondary"}
          >
            {episode.status}
          </Badge>
        </div>
      </div>

      {/* Shot 列表 */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-brand-gold" />
              Shots ({shots.length})
            </h2>
          </div>

          {shots.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clapperboard className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">暂无镜头</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {shots.map((shot) => (
                <Link
                  key={shot.id}
                  href={`/dashboard/projects/${id}/episodes/${ep}/shots/${shot.id}`}
                >
                  <Card className="hover:border-brand-gold/30 transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-4 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-medium text-foreground">
                        {shot.shot_number}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">
                          {shot.prompt || "无提示词"}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {shot.elapsed_seconds != null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {shot.elapsed_seconds}s
                            </span>
                          )}
                          {shot.credits_consumed != null && (
                            <span className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              {shot.credits_consumed.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" title={shot.status}>
                          {statusIcon[shot.status] ?? "❓"}
                        </span>
                        <Badge
                          variant={
                            shot.status === "completed"
                              ? "default"
                              : shot.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {shot.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 智能助手侧边栏 */}
        <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
          <SheetTrigger
            render={
              <button className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold text-background shadow-lg hover:bg-brand-gold/90 transition-colors md:relative md:bottom-auto md:right-auto md:h-auto md:w-auto md:rounded-lg md:px-4 md:py-2 md:shadow-none">
                <Sparkles className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline text-sm font-medium">
                  AI 助手
                </span>
              </button>
            }
          />
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle>AI 助手</SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="text-sm text-muted-foreground text-center">
                智能助手功能开发中…
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 底部操作栏 */}
      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button disabled size="sm" className="gap-1.5">
          <Play className="h-4 w-4" />
          Generate All Pending
        </Button>
        <Button disabled size="sm" variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Episode
        </Button>
      </div>
    </div>
  );
}
