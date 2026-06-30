"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";

interface Character {
  name: string;
  role: string;
  description: string;
}

interface Scene {
  name: string;
  description: string;
  shot_count: number;
}

interface AnalysisResult {
  characters: Character[];
  scenes: Scene[];
  suggestions: string[];
  recommended_template: string;
}

interface Shot {
  shot_number: number;
  type: string;
  description: string;
  prompt: string;
  duration: number;
  character: string;
}

interface Project {
  id: string;
  title: string;
}

interface Episode {
  id: string;
  title: string;
}

export default function HubPage() {
  const router = useRouter();
  const [script, setScript] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [importing, setImporting] = useState(false);

  // P2-4: 无项目时引导创建
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedEpisode, setSelectedEpisode] = useState<string>("");

  useEffect(() => {
    async function fetchProjects() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("id, title")
        .order("updated_at", { ascending: false });
      if (data) setProjects(data as Project[]);
    }
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!selectedProject) {
      setEpisodes([]);
      setSelectedEpisode("");
      return;
    }
    async function fetchEpisodes() {
      const supabase = createClient();
      const { data } = await supabase
        .from("episodes")
        .select("id, title")
        .eq("project_id", selectedProject)
        .order("episode_number", { ascending: true });
      if (data) setEpisodes(data as Episode[]);
    }
    fetchEpisodes();
  }, [selectedProject]);

  async function handleAnalyze() {
    if (!script.trim()) {
      toast.error("请输入剧本内容");
      return;
    }
    setAnalyzing(true);
    try {
      const res = await apiFetch("/api/assistant/analyze-script", {
        method: "POST",
        json: { script },
      });
      if (!res.ok) throw new Error("分析失败");
      const data = await res.json();
      setAnalysis(data as AnalysisResult);
      setShots([]);
      toast.success("剧本分析完成");
    } catch (err) {
      toast.error("分析失败，请重试");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSuggestShots() {
    setSuggesting(true);
    try {
      const res = await apiFetch("/api/assistant/suggest-shots", {
        method: "POST",
        json: { script, characters: analysis?.characters },
      });
      if (!res.ok) throw new Error("分镜生成失败");
      const data = await res.json();
      setShots((data as { shots: Shot[] }).shots ?? []);
      toast.success("分镜矩阵生成完成");
    } catch (err) {
      toast.error("分镜生成失败，请重试");
    } finally {
      setSuggesting(false);
    }
  }

  async function handleImport() {
    if (!selectedEpisode) {
      toast.error("请选择目标集");
      return;
    }
    setImporting(true);
    try {
      await Promise.all(
        shots.map((shot) =>
          apiFetch("/api/shots", {
            method: "POST",
            json: {
              episode_id: selectedEpisode,
              prompt: shot.prompt,
              reference_character_id: null,
            },
          })
        )
      );
      toast.success(`已导入 ${shots.length} 个镜头`);
      if (selectedProject && selectedEpisode) {
        router.push(`/dashboard/projects/${selectedProject}/episodes/${selectedEpisode}`);
      }
    } catch (err) {
      toast.error("导入失败");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6 animate-hud-fade-in">
      {/* 顶部 */}
      <div>
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-heading font-semibold uppercase tracking-wider text-foreground">
          剧本与分镜中枢
        </h1>
        <p className="text-sm text-muted-foreground mt-1">从一句话到全息分镜矩阵</p>
      </div>

      {/* P2-4: 无项目时的引导卡片 */}
      {projects.length === 0 ? (
        <Card className="frosted-card border-brand-gold/30 bg-brand-gold/5">
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="h-14 w-14 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-brand-gold" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">还没有项目？</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              创建一个项目来开始 AI 编剧分析，上传角色照片，生成一致性短剧视频。
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              创建新项目
            </Button>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* 左右分栏 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左栏 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <span>🧠</span> 脑机剧本引擎
            </CardTitle>
            <p className="text-xs text-muted-foreground">输入剧本，AI 自动识别角色与场景</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={8}
              placeholder={"将你的剧本粘贴到此处...\n\n她站在霓虹闪烁的街道上，雨水模糊了机械义眼的视线..."}
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="bg-white/[0.03] border-white/[0.06] text-sm"
            />

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !script.trim()}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  分析中...
                </>
              ) : (
                "⚡ AI 分析剧本"
              )}
            </Button>

            {/* 分析结果 */}
            {analysis && (
              <div className="space-y-3 pt-3 border-t border-white/[0.06]">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">角色</p>
                  <div className="flex flex-wrap gap-2">
                    {analysis.characters.map((c, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {c.name} · {c.role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">场景</p>
                  <div className="space-y-1">
                    {analysis.scenes.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-foreground">
                        <span>{s.name}</span>
                        <span className="text-muted-foreground">~{s.shot_count} 镜头</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">推荐模板</p>
                  <Badge variant="outline" className="text-xs">{analysis.recommended_template}</Badge>
                </div>
                {analysis.suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">建议</p>
                    <ul className="space-y-1">
                      {analysis.suggestions.map((s, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  onClick={handleSuggestShots}
                  disabled={suggesting}
                  className="w-full mt-3"
                  variant="outline"
                >
                  {suggesting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      拆解中...
                    </>
                  ) : (
                    "🎬 拆解分镜"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 右栏 */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-medium">🎞️ 全息分镜矩阵</h2>
            {shots.length > 0 && (
              <Badge variant="outline">{shots.length} 个镜头</Badge>
            )}
          </div>

          {shots.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {shots.map((shot) => (
                  <div
                    key={shot.shot_number}
                    className="p-3 rounded-lg border border-white/[0.06] bg-white/[0.03] backdrop-blur hover:border-brand-gold/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">
                        Shot #{shot.shot_number}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        ⏱️ {shot.duration}s · {shot.type}
                      </span>
                    </div>
                    {shot.character && (
                      <p className="text-xs text-muted-foreground mb-1">角色: {shot.character}</p>
                    )}
                    <div className="border-t border-white/[0.06] mt-2 pt-2">
                      <p className="text-xs text-muted-foreground line-clamp-2">{shot.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 导入区 */}
              <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06] mt-4">
                <CardContent className="py-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2">
                    🚀 一键导入到项目
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.06]">
                        <SelectValue placeholder="选择项目" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedEpisode} onValueChange={setSelectedEpisode} disabled={!selectedProject}>
                      <SelectTrigger className="bg-white/[0.03] border-white/[0.06]">
                        <SelectValue placeholder="选择集" />
                      </SelectTrigger>
                      <SelectContent>
                        {episodes.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleImport}
                    disabled={importing || !selectedEpisode}
                    className="w-full"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        导入中...
                      </>
                    ) : (
                      `导入 ${shots.length} 个镜头`
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {analysis ? "点击「拆解分镜」生成分镜矩阵" : "分析剧本后，分镜矩阵将在此显示"}
              </p>
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {/* P2-4: 新建项目对话框 */}
      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}
