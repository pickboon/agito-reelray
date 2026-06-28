"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
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
  Users,
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

interface Character {
  id: string;
  name: string;
  role?: string;
  anchor_image_url?: string | null;
  anchor_status?: string | null;
}

const statusIcon: Record<string, string> = {
  pending: "⏳",
  submitted: "🔄",
  processing: "⚙️",
  completed: "✅",
  failed: "❌",
  needs_review: "⚠️",
};

export default function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; ep: string }>;
}) {
  const { id, ep } = use(params);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [multiMode, setMultiMode] = useState(false);
  const [selectedChars, setSelectedChars] = useState<string[]>([]);

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

      const epData = epRes.data as Episode;
      setEpisode(epData);
      setShots((shotsRes.data ?? []) as Shot[]);

      const { data: charsData } = await supabase
        .from("characters")
        .select("*")
        .eq("project_id", epData.project_id);

      setCharacters((charsData ?? []) as Character[]);
      setLoading(false);
    }
    fetchData();
  }, [ep]);

  const toggleChar = (charId: string) => {
    setSelectedChars((prev) =>
      prev.includes(charId) ? prev.filter((c) => c !== charId) : [...prev, charId]
    );
  };

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

      {/* 角色选择器 */}
      <section className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-cyan" />
            角色选择
          </h3>
          <Button
            size="sm"
            variant={multiMode ? "default" : "outline"}
            className="h-7 text-xs"
            onClick={() => {
              setMultiMode((prev) => !prev);
              if (!multiMode) setSelectedChars([]);
            }}
          >
            {multiMode ? "多角色模式" : "单角色模式"}
          </Button>
        </div>

        {characters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {characters.map((char) => {
              const isSelected = selectedChars.includes(char.id);
              return (
                <button
                  key={char.id}
                  onClick={() => {
                    if (!multiMode) {
                      setSelectedChars(isSelected ? [] : [char.id]);
                    } else {
                      toggleChar(char.id);
                    }
                  }}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
                      : "border-border bg-background text-foreground hover:border-muted-foreground"
                  }`}
                >
                  {char.anchor_image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={char.anchor_image_url}
                      alt={char.name}
                      className="h-5 w-5 rounded object-cover"
                    />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                  <span>{char.name}</span>
                  {isSelected && <Badge className="h-4 px-1 text-[9px]">✓</Badge>}
                </button>
              );
            })}
          </div>
        )}

        {/* 多角色预览 */}
        {multiMode && selectedChars.length > 1 && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">排列预览：</p>
            <div className="flex gap-1 overflow-x-auto">
              {selectedChars.map((charId, i) => {
                const char = characters.find((c) => c.id === charId);
                return (
                  <div key={charId} className="flex flex-col items-center">
                    <div className="h-12 w-12 rounded bg-brand-cyan/10 flex items-center justify-center">
                      {char?.anchor_image_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={char.anchor_image_url}
                          alt={char?.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 text-brand-cyan" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {i + 1}. {char?.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

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
