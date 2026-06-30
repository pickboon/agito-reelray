"use client";

import { useEffect, useState } from "react";
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
import {
  ArrowLeft,
  Users,
  Palette,
  Mic,
  FlaskConical,
  Loader2,
  Play,
} from "lucide-react";

interface Project {
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

  // 灵感沙盒
  const [sandboxPrompt, setSandboxPrompt] = useState("");
  const [sandboxMode, setSandboxMode] = useState("t2v");
  const [sandboxAspectRatio, setSandboxAspectRatio] = useState("16:9");
  const [sandboxDuration, setSandboxDuration] = useState("5");
  const [sandboxRefImage, setSandboxRefImage] = useState("");
  const [sandboxLoading, setSandboxLoading] = useState(false);

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
      }

      const { data: projectData } = await supabase
        .from("projects")
        .select("id, title")
        .order("updated_at", { ascending: false });
      if (projectData) setProjects(projectData as Project[]);

      // 加载保存的视觉风格
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
    init();
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

  function handleSaveStyle() {
    if (!selectedStyle) return;
    const style: VisualStyle = { name: selectedStyle.name, neonGlow, glitchIntensity, hueShift };
    localStorage.setItem("reelray-vstyle", JSON.stringify(style));
    toast.success("风格预设已保存");
  }

  function buildPromptPrefix() {
    if (!selectedStyle) return "";
    const parts: string[] = [];
    if (neonGlow > 0) parts.push(`neon glow ${neonGlow}%`);
    if (glitchIntensity > 0) parts.push(`glitch ${glitchIntensity}%`);
    if (hueShift > 0) parts.push(`hue shift ${hueShift}°`);
    return parts.length > 0 ? `[Style: ${selectedStyle.name}] ${parts.join(", ")}` : "";
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
      toast.success("任务已提交，在渲染队列查看");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "生成失败");
    } finally {
      setSandboxLoading(false);
    }
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
          width=32
          height=32
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

            <Button size="sm" variant="outline" disabled className="w-full">
              <Play className="h-3 w-3 mr-1" />
              试听
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

            <p className="text-xs text-muted-foreground text-center">配音功能即将上线</p>
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
    </div>
  );
}
