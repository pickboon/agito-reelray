"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { apiFetch } from "@/lib/api-fetch";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Users,
  Palette,
  Mic,
  FlaskConical,
  Loader2,
  Play,
  FolderPlus,
  RotateCcw,
} from "lucide-react";

interface Project {
  id: string;
  title: string;
}

interface Episode {
  id: string;
  title: string;
}

interface Character {
  id: string;
  name: string;
  anchor_status: string;
  anchor_image_url: string | null;
  reference_image_url: string | null;
}

interface VisualStyle {
  name: string;
  neonGlow: number;
  glitchIntensity: number;
  hueShift: number;
}

interface SandboxTask {
  id: string;
  status: string;
  video_url: string | null;
  thumbnail_url: string | null;
  prompt: string;
  model_id: string;
  mode: string;
  aspect_ratio: string;
  duration: number;
}

const STYLE_PRESETS: { name: string; emoji: string; desc: string; style: VisualStyle }[] = [
  { name: "赛博", emoji: "🟣", desc: "霓虹闪烁", style: { name: "赛博", neonGlow: 80, glitchIntensity: 30, hueShift: 270 } },
  { name: "废土", emoji: "🟤", desc: "黄沙铁锈", style: { name: "废土", neonGlow: 20, glitchIntensity: 50, hueShift: 30 } },
  { name: "写实", emoji: "⚪", desc: "自然光影", style: { name: "写实", neonGlow: 0, glitchIntensity: 0, hueShift: 0 } },
];

const VOICE_PRESETS = [
  "赛博女声-冷酷",
  "赛博男声-低沉",
  "少女-清亮",
  "老者-沙哑",
  "机械-合成",
];

export default function ForgePage() {
  // 积分
  const [credits, setCredits] = useState<number | null>(null);

  // 角色锁定
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [generatingAnchor, setGeneratingAnchor] = useState<string | null>(null);

  // 视觉滤镜
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle | null>(null);
  const [neonGlow, setNeonGlow] = useState(80);
  const [glitchIntensity, setGlitchIntensity] = useState(30);
  const [hueShift, setHueShift] = useState(270);

  // 配音
  const [selectedCharacter, setSelectedCharacter] = useState<string>("");
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [emotionAnger, setEmotionAnger] = useState(50);
  const [emotionSadness, setEmotionSadness] = useState(30);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [ttsLoading, setTtsLoading] = useState(false);

  // 灵感沙盒
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [sandboxMode, setSandboxMode] = useState("t2v");
  const [sandboxAspectRatio, setSandboxAspectRatio] = useState("16:9");
  const [sandboxDuration, setSandboxDuration] = useState("5");
  const [sandboxRefImage, setSandboxRefImage] = useState("");
  const [sandboxLoading, setSandboxLoading] = useState(false);

  // P1-6: 沙盒任务追踪 & 导入
  const [sandboxTasks, setSandboxTasks] = useState<SandboxTask[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importingTaskId, setImportingTaskId] = useState<string | null>(null);
  const [importProjectId, setImportProjectId] = useState<string>("");
  const [importEpisodeId, setImportEpisodeId] = useState<string>("");
  const [importEpisodes, setImportEpisodes] = useState<Episode[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // 初始化
  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("subscriptions")
          .select("credits_remaining")
          .eq("user_id", session.user.id)
          .eq("status", "active")
          .maybeSingle();
        if (data) setCredits(data.credits_remaining);

        // P1-8: 优先从 Supabase 加载视觉风格
        try {
          const settingsRes = await apiFetch("/api/user/settings");
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData.visual_style) {
              const vs = settingsData.visual_style as VisualStyle;
              setSelectedStyle(vs);
              setNeonGlow(vs.neonGlow);
              setGlitchIntensity(vs.glitchIntensity);
              setHueShift(vs.hueShift);
            }
          }
        } catch {
          // Supabase 读取失败，fallback localStorage
        }
      }

      // localStorage fallback（Supabase 无数据时）
      if (!selectedStyle) {
        const saved = localStorage.getItem("reelray-vstyle");
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as VisualStyle;
            setSelectedStyle(parsed);
            setNeonGlow(parsed.neonGlow);
            setGlitchIntensity(parsed.glitchIntensity);
            setHueShift(parsed.hueShift);
          } catch {
            // ignore
          }
        }
      }

      const { data: projectData } = await supabase
        .from("projects")
        .select("id, title")
        .order("updated_at", { ascending: false });
      if (projectData) setProjects(projectData as Project[]);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 清理轮询
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((timer) => clearInterval(timer));
    };
  }, []);

  // 选择项目后拉取角色
  useEffect(() => {
    if (!selectedProject) {
      setCharacters([]);
      return;
    }
    async function fetchChars() {
      const supabase = createClient();
      const { data } = await supabase
        .from("characters")
        .select("id, name, anchor_status, anchor_image_url, reference_image_url")
        .eq("project_id", selectedProject);
      if (data) setCharacters(data as Character[]);
    }
    fetchChars();
  }, [selectedProject]);

  async function handleGenerateAnchor(characterId: string) {
    setGeneratingAnchor(characterId);
    try {
      const res = await apiFetch("/api/engine/generate-anchor", {
        method: "POST",
        json: { characterId },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "生成失败");
      }
      toast.success("锚点生成完成");
      // 刷新角色列表
      const supabase = createClient();
      const { data } = await supabase
        .from("characters")
        .select("id, name, anchor_status, anchor_image_url, reference_image_url")
        .eq("project_id", selectedProject);
      if (data) setCharacters(data as Character[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGeneratingAnchor(null);
    }
  }

  function handleSelectStyle(preset: typeof STYLE_PRESETS[number]) {
    setSelectedStyle(preset.style);
    setNeonGlow(preset.style.neonGlow);
    setGlitchIntensity(preset.style.glitchIntensity);
    setHueShift(preset.style.hueShift);
  }

  async function handleSaveStyle() {
    if (!selectedStyle) return;
    const style: VisualStyle = { name: selectedStyle.name, neonGlow, glitchIntensity, hueShift };
    localStorage.setItem("reelray-vstyle", JSON.stringify(style));

    // P1-8: 同步写 Supabase
    try {
      await apiFetch("/api/user/settings", {
        method: "POST",
        json: { visual_style: style },
      });
      toast.success("风格预设已保存（已同步云端）");
    } catch {
      toast.success("风格预设已保存（本地）");
    }
  }

  function buildPromptPrefix() {
    if (!selectedStyle) return "";
    const parts: string[] = [];
    if (neonGlow > 0) parts.push(`neon glow ${neonGlow}%`);
    if (glitchIntensity > 0) parts.push(`glitch ${glitchIntensity}%`);
    if (hueShift > 0) parts.push(`hue shift ${hueShift}°`);
    return parts.length > 0 ? `[Style: ${selectedStyle.name}] ${parts.join(", ")}` : "";
  }

  // P1-6: 轮询沙盒任务状态
  function startPolling(task: SandboxTask) {
    if (task.status === "completed" || task.status === "failed") return;

    const timer = setInterval(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("generation_tasks")
          .select("id, status, video_url, thumbnail_url")
          .eq("id", task.id)
          .single();

        if (!data) return;

        setSandboxTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: data.status,
                  video_url: data.video_url ?? t.video_url,
                  thumbnail_url: data.thumbnail_url ?? t.thumbnail_url,
                }
              : t
          )
        );

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(timer);
          pollingRef.current.delete(task.id);
        }
      } catch {
        // 轮询失败静默处理
      }
    }, 10000);

    pollingRef.current.set(task.id, timer);

    // 最多 5 分钟自动停止
    setTimeout(() => {
      if (pollingRef.current.has(task.id)) {
        clearInterval(pollingRef.current.get(task.id));
        pollingRef.current.delete(task.id);
      }
    }, 300000);
  }

  async function handleSandboxGenerate() {
    if (!sandboxPrompt.trim()) {
      toast.error("请输入描述");
      return;
    }
    setSandboxLoading(true);
    try {
      const body = {
        model_id: "happyhorse-1.1",
        prompt: sandboxPrompt,
        mode: sandboxMode,
        aspect_ratio: sandboxAspectRatio,
        duration: parseInt(sandboxDuration),
        reference_image_url: sandboxRefImage || undefined,
        project_id: null,
      };
      const res = await apiFetch("/api/generation/create", {
        method: "POST",
        json: body,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "生成失败");
      }
      const result = await res.json();
      const taskId = result.task_id || result.id;
      toast.success("任务已提交");

      // P1-6: 追踪任务
      const newTask: SandboxTask = {
        id: taskId,
        status: "pending",
        video_url: null,
        thumbnail_url: null,
        prompt: sandboxPrompt,
        model_id: "happyhorse-1.1",
        mode: sandboxMode,
        aspect_ratio: sandboxAspectRatio,
        duration: parseInt(sandboxDuration),
      };
      setSandboxTasks((prev) => [newTask, ...prev].slice(0, 5));
      startPolling(newTask);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setSandboxLoading(false);
    }
  }

  // P1-6: 打开导入弹窗，拉取项目-集级联
  async function openImportDialog(taskId: string) {
    setImportingTaskId(taskId);
    setImportProjectId("");
    setImportEpisodeId("");
    setImportEpisodes([]);
    setImportDialogOpen(true);
  }

  async function handleProjectChange(projectId: string) {
    setImportProjectId(projectId);
    setImportEpisodeId("");
    if (!projectId) {
      setImportEpisodes([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("episodes")
      .select("id, title")
      .eq("project_id", projectId)
      .order("episode_number", { ascending: true });
    setImportEpisodes((data as Episode[]) ?? []);
  }

  async function handleStartImport() {
    if (!importingTaskId || !importProjectId || !importEpisodeId) {
      toast.error("请选择项目和集");
      return;
    }

    const task = sandboxTasks.find((t) => t.id === importingTaskId);
    if (!task) return;

    setImportLoading(true);
    try {
      const res = await apiFetch("/api/shots", {
        method: "POST",
        json: {
          project_id: importProjectId,
          episode_id: importEpisodeId,
          prompt: task.prompt,
          model: task.model_id,
          mode: task.mode,
          aspect_ratio: task.aspect_ratio,
          duration: task.duration,
          video_url: task.video_url,
          thumbnail_url: task.thumbnail_url,
          status: task.status,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "导入失败");
      }
      toast.success("已导入到项目集");
      setSandboxTasks((prev) => prev.filter((t) => t.id !== importingTaskId));
      setImportDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImportLoading(false);
    }
  }

  async function handleRetrySandboxTask(task: SandboxTask) {
    setSandboxTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: "pending", video_url: null, thumbnail_url: null } : t))
    );
    try {
      const res = await apiFetch("/api/generation/create", {
        method: "POST",
        json: {
          model_id: task.model_id,
          prompt: task.prompt,
          mode: task.mode,
          aspect_ratio: task.aspect_ratio,
          duration: task.duration,
          project_id: null,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "重试失败");
      }
      const result = await res.json();
      const newId = result.task_id || result.id;
      const newTask: SandboxTask = { ...task, id: newId, status: "pending", video_url: null, thumbnail_url: null };
      setSandboxTasks((prev) => prev.map((t) => (t.id === task.id ? newTask : t)));
      startPolling(newTask);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重试失败");
      setSandboxTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "failed" } : t))
      );
    }
  }

  async function handleTtsPreview() {
    if (!selectedVoice) {
      toast.error("请选择音色");
      return;
    }

    // Build test text
    let charName = "测试角色";
    if (selectedCharacter) {
      const char = characters.find((c) => c.id === selectedCharacter);
      if (char) charName = char.name;
    }
    const testText = `你好，我是${charName}，这是我的声音`;

    setTtsLoading(true);
    try {
      // Determine emotion from sliders
      let emotion: string | undefined;
      if (emotionAnger > emotionSadness && emotionAnger > 50) {
        emotion = "angry";
      } else if (emotionSadness > emotionAnger && emotionSadness > 50) {
        emotion = "sad";
      }

      const res = await apiFetch("/api/audio/tts", {
        method: "POST",
        json: {
          text: testText,
          voice: selectedVoice,
          speech_rate: speechRate,
          ...(emotion ? { emotion } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "配音失败");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
      toast.success("试听播放中");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "配音失败");
    } finally {
      setTtsLoading(false);
    }
  }

  function statusBadge(status: string) {
    const map: Record<string, { label: string; className: string }> = {
      pending: { label: "等待中", className: "text-muted-foreground" },
      running: { label: "生成中", className: "text-brand-cyan" },
      submitted: { label: "已提交", className: "text-brand-cyan" },
      completed: { label: "已完成", className: "text-brand-green" },
      failed: { label: "失败", className: "text-brand-magenta" },
      cancelled: { label: "已取消", className: "text-muted-foreground" },
    };
    const info = map[status] ?? { label: status, className: "text-muted-foreground" };
    return (
      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${info.className}`}>
        {info.label}
      </Badge>
    );
  }

  return (
    <div className="space-y-6 animate-hud-fade-in">
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-heading font-semibold uppercase tracking-wider text-foreground">
            资产锻造炉
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ASSET FORGE</p>
        </div>
        {credits !== null && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            🪙 {credits.toLocaleString()} 积分
          </Badge>
        )}
      </div>

      {/* Bento 2x2 网格 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* ① 角色锁定 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06] md:row-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Users className="h-4 w-4 text-brand-cyan" />
              角色锁定
            </CardTitle>
            <p className="text-xs text-muted-foreground">Character Fix</p>
          </CardHeader>
          <CardContent className="space-y-4">
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

            {!selectedProject ? (
              <p className="text-sm text-muted-foreground text-center py-8">选择一个项目查看角色</p>
            ) : characters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">此项目暂无角色，去项目详情页添加</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:border-brand-cyan/30 transition-colors"
                  >
                    {char.anchor_image_url || char.reference_image_url ? (
                      <Image
                        src={char.anchor_image_url ?? char.reference_image_url ?? ""}
                        alt={char.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-cyan/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-brand-cyan">
                          {char.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{char.name}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {char.anchor_status}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleGenerateAnchor(char.id)}
                      disabled={generatingAnchor === char.id || !char.reference_image_url}
                    >
                      {generatingAnchor === char.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "生成锚点"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ② 视觉滤镜 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Palette className="h-4 w-4 text-brand-gold" />
              视觉滤镜
            </CardTitle>
            <p className="text-xs text-muted-foreground">Visual Style</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectStyle(preset)}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                    selectedStyle?.name === preset.name
                      ? "border-brand-gold ring-1 ring-brand-gold/40"
                      : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <span className="text-xl mb-1">{preset.emoji}</span>
                  <span className="text-xs font-medium">{preset.name}</span>
                  <span className="text-[10px] text-muted-foreground">{preset.desc}</span>
                </button>
              ))}
            </div>

            {selectedStyle && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">霓虹光晕</span>
                    <span className="font-mono">{neonGlow}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={neonGlow}
                    onChange={(e) => setNeonGlow(parseInt(e.target.value))}
                    className="w-full accent-brand-gold"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">故障强度</span>
                    <span className="font-mono">{glitchIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={glitchIntensity}
                    onChange={(e) => setGlitchIntensity(parseInt(e.target.value))}
                    className="w-full accent-brand-gold"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">色彩偏移</span>
                    <span className="font-mono">{hueShift}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={hueShift}
                    onChange={(e) => setHueShift(parseInt(e.target.value))}
                    className="w-full accent-brand-gold"
                  />
                </div>

                <code className="block p-2 rounded bg-white/[0.03] border border-white/[0.06] text-xs text-brand-gold font-mono">
                  {buildPromptPrefix()}
                </code>

                <Button size="sm" variant="outline" onClick={handleSaveStyle} className="w-full">
                  保存风格预设
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* ③ 神经元配音 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Mic className="h-4 w-4 text-brand-cyan" />
              神经元配音
            </CardTitle>
            <p className="text-xs text-muted-foreground">Neural TTS</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06]">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {characters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedVoice} onValueChange={setSelectedVoice}>
              <SelectTrigger className="bg-white/[0.03] border-white/[0.06]">
                <SelectValue placeholder="音色库" />
              </SelectTrigger>
              <SelectContent>
                {VOICE_PRESETS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleTtsPreview}
              disabled={ttsLoading || !selectedVoice}
            >
              {ttsLoading ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  合成中...
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  试听
                </>
              )}
            </Button>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">愤怒</span>
                <span className="font-mono">{emotionAnger}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={emotionAnger}
                onChange={(e) => setEmotionAnger(parseInt(e.target.value))}
                className="w-full accent-brand-cyan"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">悲伤</span>
                <span className="font-mono">{emotionSadness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={emotionSadness}
                onChange={(e) => setEmotionSadness(parseInt(e.target.value))}
                className="w-full accent-brand-cyan"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">语速</span>
                <span className="font-mono">{speechRate.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                value={speechRate * 100}
                onChange={(e) => setSpeechRate(parseInt(e.target.value) / 100)}
                className="w-full accent-brand-cyan"
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              试听消耗积分，实际配音导出时从项目积分扣除
            </p>
          </CardContent>
        </Card>

        {/* ④ 灵感沙盒 */}
        <Card className="backdrop-blur bg-white/[0.03] border-white/[0.06]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <FlaskConical className="h-4 w-4 text-brand-gold" />
              灵感沙盒
            </CardTitle>
            <p className="text-xs text-muted-foreground">AI Sandbox</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={4}
              placeholder="描述你想要的画面..."
              value={sandboxPrompt}
              onChange={(e) => setSandboxPrompt(e.target.value)}
              className="bg-white/[0.03] border-white/[0.06] text-sm"
            />

            <div className="grid grid-cols-3 gap-2">
              <Select value={sandboxMode} onValueChange={setSandboxMode}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="t2v">文生视频</SelectItem>
                  <SelectItem value="r2v">图生视频</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sandboxAspectRatio} onValueChange={setSandboxAspectRatio}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="16:9">16:9</SelectItem>
                  <SelectItem value="9:16">9:16</SelectItem>
                  <SelectItem value="1:1">1:1</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sandboxDuration} onValueChange={setSandboxDuration}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5s</SelectItem>
                  <SelectItem value="10">10s</SelectItem>
                  <SelectItem value="15">15s</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="参考图URL，可选"
              value={sandboxRefImage}
              onChange={(e) => setSandboxRefImage(e.target.value)}
              className="bg-white/[0.03] border-white/[0.06] text-sm"
            />

            <Button
              onClick={handleSandboxGenerate}
              disabled={sandboxLoading || !sandboxPrompt.trim()}
              className="w-full"
            >
              {sandboxLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  提交中...
                </>
              ) : (
                "🎲 随机生成"
              )}
            </Button>

            {/* P1-6: 最近生成任务列表 */}
            {sandboxTasks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <p className="text-xs text-muted-foreground font-medium">最近生成</p>
                {sandboxTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-white/[0.06] bg-white/[0.02]"
                  >
                    {task.thumbnail_url && task.status === "completed" ? (
                      <Image
                        src={task.thumbnail_url}
                        alt={task.prompt.slice(0, 20)}
                        width={40}
                        height={56}
                        className="rounded object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-[40px] h-[56px] rounded bg-white/[0.04] flex items-center justify-center shrink-0">
                        {task.status === "failed" ? (
                          <span className="text-brand-magenta text-[10px]">✕</span>
                        ) : (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs truncate">{task.prompt.slice(0, 30)}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {statusBadge(task.status)}
                        <span className="text-[10px] text-muted-foreground">
                          {task.mode === "t2v" ? "文生视频" : "图生视频"} · {task.aspect_ratio} · {task.duration}s
                        </span>
                      </div>
                    </div>
                    {task.status === "completed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-brand-cyan hover:text-brand-cyan hover:bg-brand-cyan/10"
                        onClick={() => openImportDialog(task.id)}
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {task.status === "failed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => handleRetrySandboxTask(task)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              满意的结果可转存到素材库
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 提示条 */}
      <p className="text-xs text-muted-foreground text-center py-2">
        灵感沙盒消耗积分与正式生成相同，满意后可在队列中转存。
      </p>

      {/* P1-6: 导入弹窗 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>导入到项目</DialogTitle>
            <DialogDescription>
              将沙盒生成结果保存为项目集中的镜头。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">选择项目</label>
              <Select value={importProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] w-full">
                  <SelectValue placeholder="选择项目" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">选择集</label>
              <Select value={importEpisodeId} onValueChange={setImportEpisodeId} disabled={!importProjectId}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06] w-full">
                  <SelectValue placeholder={importProjectId ? "选择集" : "请先选择项目"} />
                </SelectTrigger>
                <SelectContent>
                  {importEpisodes.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id}>{ep.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>取消</Button>
            <Button
              onClick={handleStartImport}
              disabled={importLoading || !importProjectId || !importEpisodeId}
            >
              {importLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  导入中...
                </>
              ) : (
                "确认导入"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
