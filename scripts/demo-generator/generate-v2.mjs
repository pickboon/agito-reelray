// generate-v2.mjs — ReelRay 样片生成器 V2
// 改进：角色肖像 Bible Pipeline / 修正分辨率 / 重构 prompt / negative prompt / crossfade

import { execSync } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

// ─── 常量 ───────────────────────────────────────────────────────────────────

const API_KEY = 'sk-ws-H.RYEEIPH.IvKl.MEQCIDl-mkf-ySARvvYE_T2aubgBaj9mUiF87G5WMJFXU-snAiAnOGoTufoyRyGoYFJYVHQf9aYmmP5WjBr9_3Q0k8c1Vg';
const SUBMIT_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis';
const POLL_URL_TPL = 'https://dashscope.aliyuncs.com/api/v1/tasks/{taskId}';
const FFMPEG = '/opt/homebrew/bin/ffmpeg';
const OUTPUT_BASE = '/Users/mac/Projects/agito-reelray/public/demos/v2';
const POLL_INTERVAL_MS = 5000;
const POLL_MAX = 40;
const SHOT_RETRIES = 2;
const SUBMIT_TIMEOUT_MS = 60_000;
const POLL_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 10_000;
const SIZE = '1920*1080';

// ─── Negative Prompt ────────────────────────────────────────────────────────

const NEG_PROMPT = 'distorted face, asymmetrical eyes, crossed eyes, plastic skin, waxy skin, deformed hands, fused fingers, blurry, low quality, pixelated, jpeg artifacts, watermark, text, ugly, disfigured, extra limbs, bad anatomy, cloning, double face, mutation';

// ─── 角色视觉身份证（角色 Bible Prompt 片段）─────────────────────────────────

const CHARACTER_BANNER = 'Beautiful European woman, 27 years old, heart-shaped face, luminous porcelain skin with subtle natural texture, large almond-shaped grey-blue eyes with long dark lashes, softly arched natural brows, straight refined nose, full rose-pink lips with defined cupid\'s bow, high elegant cheekbones not sharp but sculpted, platinum blonde hair in a sleek modern shoulder-length bob with side part, one side tucked behind ear revealing a delicate silver ear cuff, natural dewy skin finish, subtle inner-corner eye highlight, look of quiet confidence and controlled intensity';

// ─── 样片配置 ────────────────────────────────────────────────────────────────

const DEMOS = [
  {
    id: 'banner_hero',
    totalDuration: 15,
    characterBible: CHARACTER_BANNER,
    // 第 0 镜：角色肖像静帧（用于提取 Bible 参考图）
    portrait: {
      mode: 't2v',
      duration: 3,
      prompt: `${CHARACTER_BANNER}. Studio portrait photography, soft diffused key light from front-left creating gentle shadows, dark grey seamless background, subject centered filling 70% of frame, looking directly at camera with a subtle knowing half-smile, head and shoulders only, no armor no sci-fi elements — pure natural portrait. Shot on 85mm f/1.4, razor-sharp focus on eyes, creamy bokeh background. Editorial beauty photography, Vogue cover style, 4K, photorealistic.`,
    },
    shots: [
      {
        mode: 't2v',
        duration: 5,
        prompt: `${CHARACTER_BANNER}, wearing a midnight-black structured blazer with satin lapels over a cream silk camisole, wide-leg black trousers, minimal silver jewelry — a thin chain necklace and the silver ear cuff. She walks toward camera through a vast open-plan concrete-and-glass architecture space, floor-to-ceiling windows on both sides flooding the space with soft diffused morning light. Her strides are slow, deliberate, unhurried. Wind from an unseen source lifts the ends of her hair. Behind her, a panoramic city skyline at dawn — pale gold and dusty rose clouds streaking across a lightening sky. Camera tracks backward at her pace, low angle slightly looking up. Anamorphic lens, shallow depth of field on her face, architectural symmetry framing her figure. Editorial fashion cinematography, warm golden hour grading, 4K cinematic quality.`,
      },
      {
        mode: 'r2v',
        duration: 5,
        prompt: `${CHARACTER_BANNER}, same outfit as previous shot. Medium close-up, face filling the left two-thirds of frame, eye level. She pauses mid-stride, turns her head slightly toward camera. Her expression transforms slowly — from neutral assessment to the barest hint of a smile, not warm but knowing, the smile of someone who has already won and is simply waiting for everyone else to realize it. Her grey-blue eyes hold the lens with magnetic intensity. Soft window light from frame-left wraps her face, creating a delicate highlight along her hairline and jaw. Background is the out-of-focus architecture dissolving into creamy bokeh with hints of golden morning light. Extreme sharpness on her eyes, natural skin texture visible. Shallow depth of field, 85mm portrait lens aesthetic. Editorial beauty cinematography, 4K cinematic quality.`,
      },
      {
        mode: 'r2v',
        duration: 5,
        prompt: `${CHARACTER_BANNER}, same outfit as previous shots. Low-angle tracking shot from behind and slightly to the side as she walks away from camera. Her silhouette is sharp and elegant against the massive window wall ahead — the city skyline now fully illuminated in warm gold. She glances back over her right shoulder, the side with the silver ear cuff catching a glint of light, her grey-blue eyes meeting the lens for one held breath. Then she turns forward and continues walking, her figure gradually enveloped by the golden glare pouring through the glass. Camera holds position as she becomes a silhouette then dissolves into light. A single strand of platinum hair floats in the air where she was. Anamorphic lens flare blooms across the frame. Slow motion. Editorial fashion cinematography, 4K cinematic quality.`,
      },
    ],
  },
];

// ─── 工具函数 ────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function padShot(n, total) {
  return String(n).padStart(String(total).length, '0');
}

function log(demoId, msg) {
  console.log(`[${demoId}] ${msg}`);
}

// ─── API: 提交任务 ──────────────────────────────────────────────────────────

async function submit(prompt, mode, duration, refImgUrl, demoId, shotLabel) {
  const model = mode === 'r2v' ? 'happyhorse-1.1-r2v' : 'happyhorse-1.1-t2v';

  const input = { prompt, negative_prompt: NEG_PROMPT };
  if (mode === 'r2v' && refImgUrl) {
    input.media = [{ url: refImgUrl }];
  }

  const body = {
    model,
    input,
    parameters: { size: SIZE, duration },
  };

  log(demoId, `Shot ${shotLabel}: 提交任务 (model=${model}, duration=${duration}s, size=${SIZE})`);

  const resp = await fetch(SUBMIT_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });

  if (resp.status === 429 || resp.status >= 500) {
    throw new Error(`HTTP ${resp.status} — 需要重试`);
  }

  const data = await resp.json();

  if (!data?.output?.task_id) {
    throw new Error(`提交失败: ${JSON.stringify(data)}`);
  }

  return data.output.task_id;
}

// ─── API: 轮询状态 ─────────────────────────────────────────────────────────

async function poll(taskId, demoId, shotLabel) {
  const url = POLL_URL_TPL.replace('{taskId}', taskId);
  let lastStatus = '';

  for (let i = 0; i < POLL_MAX; i++) {
    await sleep(POLL_INTERVAL_MS);

    let resp;
    try {
      resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
      });
    } catch (err) {
      log(demoId, `Shot ${shotLabel}: 轮询网络错误 — ${err.message}，继续重试`);
      continue;
    }

    if (resp.status === 429 || resp.status >= 500) {
      log(demoId, `Shot ${shotLabel}: 轮询 HTTP ${resp.status}，等待 ${RETRY_DELAY_MS / 1000}s`);
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    const data = await resp.json();
    const status = data?.output?.task_status;
    lastStatus = status;

    if (status === 'SUCCEEDED') {
      const videoUrl = data.output?.video_url;
      if (!videoUrl) throw new Error(`SUCCEEDED 但无 video_url: ${JSON.stringify(data.output)}`);
      log(demoId, `Shot ${shotLabel}: 生成完成`);
      return { status: 'completed', videoUrl };
    }

    if (status === 'FAILED') {
      const msg = data.output?.message || '未知错误';
      throw new Error(`任务失败: ${msg}`);
    }

    if (i % 4 === 0) {
      log(demoId, `Shot ${shotLabel}: 轮询中 (${status}, ${i + 1}/${POLL_MAX})`);
    }
  }

  throw new Error(`轮询超时 (最后状态: ${lastStatus})`);
}

// ─── 文件操作 ────────────────────────────────────────────────────────────────

async function download(url, filepath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`下载失败: HTTP ${resp.status}`);
  await pipeline(Readable.fromWeb(resp.body), createWriteStream(filepath));
}

function extractFrame(videoPath, jpgPath) {
  execSync(`${FFMPEG} -y -i "${videoPath}" -frames:v 1 -q:v 2 "${jpgPath}"`, {
    stdio: 'pipe',
  });
}

function base64Encode(jpgPath) {
  const buf = readFileSync(jpgPath);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

// ─── 单个 demo 主流程 ────────────────────────────────────────────────────────

async function generateDemo(demo) {
  const { id, shots, totalDuration, characterBible, portrait } = demo;
  const outDir = join(OUTPUT_BASE, `${id}_${totalDuration}s`);
  mkdirSync(outDir, { recursive: true });

  log(id, `开始生成 — ${shots.length} 个镜头 + 角色肖像，输出: ${outDir}`);

  const errors = [];
  const shotFiles = [];
  let refImgDataUrl = null;

  // Phase 0: 生成角色肖像静帧作为 Bible 参考图
  log(id, 'Phase 0: 生成角色肖像 Bible...');
  const portraitPath = join(outDir, 'portrait.mp4');
  const portraitFramePath = join(outDir, 'portrait_frame.jpg');

  for (let attempt = 0; attempt <= SHOT_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        log(id, `肖像: 第 ${attempt} 次重试`);
        await sleep(3000);
      }
      const taskId = await submit(portrait.prompt, portrait.mode, portrait.duration, null, id, 'Portrait');
      await sleep(2000);
      const result = await poll(taskId, id, 'Portrait');
      if (result.status !== 'completed') throw new Error('非预期状态');
      log(id, '肖像: 下载中...');
      await download(result.videoUrl, portraitPath);
      log(id, '肖像: 提取首帧...');
      extractFrame(portraitPath, portraitFramePath);
      refImgDataUrl = base64Encode(portraitFramePath);
      log(id, `肖像: Bible 已就绪 (base64 ${(refImgDataUrl.length / 1024).toFixed(0)}KB)`);
      break;
    } catch (err) {
      log(id, `肖像: 错误 — ${err.message}`);
      if (attempt === SHOT_RETRIES) {
        log(id, '肖像 Bible 生成失败，将回退到无参考图管线');
      }
    }
  }

  // Phase 1: 生成正式镜头
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const num = padShot(i + 1, shots.length);
    const shotLabel = `${i + 1}/${shots.length}`;
    const videoPath = join(outDir, `shot_${num}.mp4`);

    let success = false;

    for (let attempt = 0; attempt <= SHOT_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          log(id, `Shot ${shotLabel}: 第 ${attempt} 次重试`);
          await sleep(3000);
        }

        const refUrl = shot.mode === 'r2v' ? refImgDataUrl : null;
        const taskId = await submit(
          shot.prompt, shot.mode, shot.duration, refUrl, id, shotLabel,
        );

        await sleep(2000);

        const result = await poll(taskId, id, shotLabel);
        if (result.status !== 'completed') throw new Error('非预期状态');

        log(id, `Shot ${shotLabel}: 下载中...`);
        await download(result.videoUrl, videoPath);
        log(id, `Shot ${shotLabel}: DONE → shot_${num}.mp4`);

        shotFiles.push({ file: `shot_${num}.mp4`, path: videoPath });

        // 如果没有 Bible，用 Shot 1 首帧做 fallback
        if (i === 0 && !refImgDataUrl) {
          const framePath = join(outDir, 'frame_01.jpg');
          log(id, `Shot ${shotLabel}: 提取首帧作为 fallback...`);
          extractFrame(videoPath, framePath);
          refImgDataUrl = base64Encode(framePath);
          log(id, `Shot ${shotLabel}: fallback 参考图已就绪`);
        }

        success = true;
        break;
      } catch (err) {
        log(id, `Shot ${shotLabel}: 错误 — ${err.message}`);
        if (attempt === SHOT_RETRIES) {
          errors.push({ shot: `shot_${num}`, error: err.message });
        }
      }
    }

    if (!success) {
      log(id, `Shot ${shotLabel}: 已达最大重试次数，跳过`);
    }
  }

  if (shotFiles.length === 0) {
    log(id, '所有镜头均失败，跳过拼接');
    return { id, shots: shots.length, shotFiles: [], final: null, status: 'failed', errors };
  }

  // Phase 2: ffmpeg crossfade 拼接
  const finalName = `final_${totalDuration}s.mp4`;
  const finalPath = join(outDir, finalName);

  try {
    log(id, `拼接 ${shotFiles.length} 个片段 (crossfade) → ${finalName}`);

    if (shotFiles.length === 1) {
      // 单镜直接复制
      execSync(`${FFMPEG} -y -i "${shotFiles[0].path}" -c copy "${finalPath}"`, { stdio: 'pipe' });
    } else {
      // 多镜 crossfade: 每两个镜头之间 0.3s dissolve
      const inputs = shotFiles.map((_, idx) => `-i "${shotFiles[idx].path}"`).join(' ');
      // 构建 filter_complex
      const filterParts = [];
      // 每个输入先 setpts
      for (let i = 0; i < shotFiles.length; i++) {
        filterParts.push(`[${i}:v]setpts=PTS-STARTPTS,format=yuva420p[f${i}]`);
      }
      // 叠加 crossfade
      let prev = 'f0';
      for (let i = 1; i < shotFiles.length; i++) {
        const offset = (i === 1)
          ? `duration=0.3:offset=${5 - 0.3}`  // first crossfade starts at (first shot duration - 0.3)
          : `duration=0.3`;
        filterParts.push(`[${prev}][f${i}]overlay=x=0:y=0:shortest=1:${offset}[tmp${i}]`);
        prev = `tmp${i}`;
      }
      filterParts.push(`[${prev}]format=yuv420p[v]`);

      const filterComplex = filterParts.join(';');
      const cmd = `${FFMPEG} -y ${inputs} -filter_complex "${filterComplex}" -map "[v]" -r 24 -pix_fmt yuv420p "${finalPath}"`;

      log(id, `crossfade cmd: ${cmd.substring(0, 200)}...`);
      execSync(cmd, { stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 });
    }

    log(id, `拼接完成 → ${finalName}`);
  } catch (err) {
    log(id, `Crossfade 拼接失败: ${err.message}，尝试 fallback concat`);
    // fallback: 普通 concat
    try {
      const concatPath = join(outDir, 'concat_list.txt');
      const concatContent = shotFiles.map((f) => `file '${f.file}'`).join('\n') + '\n';
      writeFileSync(concatPath, concatContent);
      execSync(
        `${FFMPEG} -y -f concat -safe 0 -i "${concatPath}" -c copy "${finalPath}"`,
        { stdio: 'pipe' },
      );
      log(id, `fallback concat 拼接完成`);
    } catch (e2) {
      log(id, `fallback 也失败: ${e2.message}`);
      errors.push({ shot: 'concat', error: `crossfade: ${err.message}; concat: ${e2.message}` });
      return { id, shots: shots.length, shotFiles: shotFiles.map(f => f.file), final: null, status: 'partial', errors };
    }
  }

  return {
    id,
    shots: shots.length,
    shotFiles: shotFiles.map(f => f.file),
    final: finalName,
    status: errors.length > 0 ? 'partial' : 'completed',
    errors,
  };
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log(' ReelRay 样片生成器 V2');
  console.log(` 输出目录: ${OUTPUT_BASE}`);
  console.log(` 样片数量: ${DEMOS.length}`);
  console.log(` 分辨率: ${SIZE}`);
  console.log(` 改进: 角色肖像 Bible + 重构 Prompt + Negative Prompt + Crossfade`);
  console.log('='.repeat(60));

  mkdirSync(OUTPUT_BASE, { recursive: true });

  const results = [];
  const startTime = Date.now();

  for (const demo of DEMOS) {
    console.log('');
    console.log('-'.repeat(60));
    try {
      const result = await generateDemo(demo);
      results.push(result);
    } catch (err) {
      console.error(`[${demo.id}] 致命错误: ${err.message}`);
      results.push({
        id: demo.id,
        shots: demo.shots.length,
        shotFiles: [],
        final: null,
        status: 'failed',
        errors: [{ shot: 'demo', error: err.message }],
      });
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    version: 'v2',
    improvements: [
      '角色肖像 Bible Pipeline (先独立生成面部特写作为 r2v 参考)',
      '分辨率修正: 1920*1080',
      'Prompt 结构重组: 角色身份证 → 场景灯光 → 动作情绪',
      '添加 negative prompt',
      '镜头间 0.3s crossfade 过渡',
    ],
    demos: results.map((r) => ({
      id: r.id,
      shots: r.shots,
      shot_videos: r.shotFiles,
      final: r.final,
      status: r.status,
      errors: r.errors,
    })),
  };

  writeFileSync(join(OUTPUT_BASE, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('='.repeat(60));
  console.log(' 生成完成 — 汇总表');
  console.log('='.repeat(60));
  console.log('');
  console.log(
    'Demo'.padEnd(24) +
    'Shots'.padEnd(8) +
    'Final'.padEnd(22) +
    'Status',
  );
  console.log('-'.repeat(60));
  for (const r of results) {
    console.log(
      r.id.padEnd(24) +
      String(r.shots).padEnd(8) +
      (r.final || '-').padEnd(22) +
      r.status,
    );
    if (r.errors.length > 0) {
      for (const e of r.errors) {
        console.log(`  [!] ${e.shot}: ${e.error}`);
      }
    }
  }
  console.log('-'.repeat(60));
  console.log(`总耗时: ${elapsed}s`);
  console.log(`Manifest: ${join(OUTPUT_BASE, 'manifest.json')}`);
}

main().catch((err) => {
  console.error('未捕获错误:', err);
  process.exit(1);
});
