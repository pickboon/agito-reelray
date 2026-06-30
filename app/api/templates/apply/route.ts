import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { validateCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// 内置预设参数
const PRESETS: Record<string, {
  prompt: string;
  model: string;
  mode: string;
  aspect_ratio: string;
  duration: number;
  name: string;
  description: string;
}> = {
  revenge: {
    prompt: "urban revenge drama, intense lighting, dramatic close-ups",
    model: "happyhorse-1.1-t2v",
    mode: "t2v",
    aspect_ratio: "9:16",
    duration: 5,
    name: "复仇重生",
    description: "逆袭打脸爽剧",
  },
  romance: {
    prompt: "romantic drama, soft warm lighting, emotional close-ups",
    model: "happyhorse-1.1-t2v",
    mode: "t2v",
    aspect_ratio: "9:16",
    duration: 5,
    name: "甜宠虐恋",
    description: "甜虐交织恋爱",
  },
  thriller: {
    prompt: "suspense thriller, low-key lighting, tense atmosphere",
    model: "happyhorse-1.1-t2v",
    mode: "t2v",
    aspect_ratio: "9:16",
    duration: 5,
    name: "悬疑惊悚",
    description: "烧脑反转推理",
  },
  fantasy: {
    prompt: "xianxia fantasy, ethereal lighting, majestic scenery",
    model: "happyhorse-1.1-t2v",
    mode: "t2v",
    aspect_ratio: "9:16",
    duration: 5,
    name: "穿越仙侠",
    description: "修仙奇幻冒险",
  },
};

// 5 个分镜的通用描述后缀
const SHOT_BEATS = [
  "Opening shot, protagonist enters the scene",
  "Rising tension, key confrontation begins",
  "Turning point, dramatic close-up",
  "Climax, decisive action unfolds",
  "Resolution, protagonist standing tall",
];

// POST /api/templates/apply — 使用模板（内置 preset 或 user_templates）创建新项目
export async function POST(request: NextRequest) {
  try {
    // CSRF 校验
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }

    // Rate limit: 10 次/分钟每 IP
    const clientIp = request.headers.get("x-forwarded-for") ?? "unknown";
    if (!(await checkRateLimit(`templates-apply:${clientIp}`, 10, 60000))) {
      return NextResponse.json({ error: "请求过于频繁，请稍后再试" }, { status: 429 });
    }

    // Auth 校验
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 解析入参
    const body = await request.json();
    const { template_id, preset } = body as { template_id?: string; preset?: string };

    // 确定模板参数来源
    let tplPrompt: string;
    let tplModel: string;
    let tplMode: string;
    let tplAspectRatio: string;
    let tplDuration: number;
    let tplName: string;
    let tplDescription: string | null;
    let actualTemplateId: string | null = null;

    if (template_id) {
      // 从 user_templates 表查询
      const { data: tpl, error } = await supabase
        .from("user_templates")
        .select("id, name, description, prompt, model_id, mode, aspect_ratio, duration")
        .eq("id", template_id)
        .single();

      if (error || !tpl) {
        return NextResponse.json({ error: "模板不存在" }, { status: 404 });
      }

      tplPrompt = tpl.prompt;
      tplModel = tpl.model_id;
      tplMode = tpl.mode;
      tplAspectRatio = tpl.aspect_ratio;
      tplDuration = tpl.duration;
      tplName = tpl.name;
      tplDescription = tpl.description;
      actualTemplateId = tpl.id;
    } else if (preset && PRESETS[preset]) {
      const p = PRESETS[preset];
      tplPrompt = p.prompt;
      tplModel = p.model;
      tplMode = p.mode;
      tplAspectRatio = p.aspect_ratio;
      tplDuration = p.duration;
      tplName = p.name;
      tplDescription = p.description;
    } else {
      return NextResponse.json({ error: "缺少 template_id 或 preset 参数" }, { status: 400 });
    }

    // 1. 创建项目
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: tplName,
        description: tplDescription,
        template_id: actualTemplateId,
        status: "draft",
        aspect_ratio: tplAspectRatio,
      })
      .select("id")
      .single();

    if (projectError || !project) {
      logger.error("templates/apply project insert", projectError);
      return NextResponse.json({ error: "创建项目失败" }, { status: 500 });
    }

    // 2. 创建第1集
    const { data: episode, error: episodeError } = await supabase
      .from("episodes")
      .insert({
        project_id: project.id,
        episode_number: 1,
        title: "第1集",
        status: "draft",
      })
      .select("id")
      .single();

    if (episodeError || !episode) {
      logger.error("templates/apply episode insert", episodeError);
      return NextResponse.json({ error: "创建集数失败" }, { status: 500 });
    }

    // 3. 创建 5 个 placeholder shots
    const shots = SHOT_BEATS.map((beat, i) => ({
      episode_id: episode.id,
      shot_number: i + 1,
      prompt: `${tplPrompt} - ${beat}`,
      model: tplModel,
      mode: tplMode,
      aspect_ratio: tplAspectRatio,
      duration: tplDuration,
      status: "pending" as const,
    }));

    const { error: shotsError } = await supabase
      .from("shots")
      .insert(shots);

    if (shotsError) {
      logger.error("templates/apply shots insert", shotsError);
      return NextResponse.json({ error: "创建分镜失败" }, { status: 500 });
    }

    // 4. 增加模板使用次数（仅当 template_id 有值时）
    if (actualTemplateId) {
      const { error: rpcError } = await supabase.rpc("increment_use_count", {
        p_template_id: actualTemplateId,
      });
      if (rpcError) {
        // 非关键操作，仅记录警告
        logger.warn("templates/apply increment_use_count", rpcError.message);
      }
    }

    return NextResponse.json(
      { project_id: project.id, episode_id: episode.id },
      { status: 201 }
    );
  } catch (error) {
    logger.error("templates/apply", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
