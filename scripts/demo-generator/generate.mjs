// generate.mjs — ReelRay 样片生成器
// 单文件 ESM 脚本，顺序生成 3 条样片（banner_hero / demo_romance / demo_warlord）

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

// ─── 样片配置 ────────────────────────────────────────────────────────────────

const DEMOS = [
  {
    id: 'banner_hero',
    totalDuration: 15,
    shots: [
      {
        mode: 't2v',
        duration: 5,
        prompt: "Cinematic wide shot of a striking European woman in her late 20s walking through a dark futuristic corridor, floor-to-ceiling black marble walls with thin cyan LED light strips running horizontally at eye level. She has platinum blonde short hair slicked back, piercing grey-blue eyes, sharp cheekbones, wearing a black high-neck sleeveless top with metallic shoulder armor pieces, faint cyan circuit-like tattoos glowing on her wrists. She walks toward camera with slow deliberate strides, her figure silhouetted against a massive holographic golden light source behind her. Cyan rim lighting traces her jawline and collarbone, golden backlight creates a halo. Floating dust particles catch the cyan beams. Anamorphic lens, shallow depth of field, slow motion. Dark sci-fi luxury aesthetic, portrait photography style, editorial fashion. 4K cinematic quality, powerful entrance and controlled menace.",
      },
      {
        mode: 'r2v',
        duration: 5,
        prompt: "Medium close-up of the same European woman with platinum blonde slicked-back hair and grey-blue eyes, face filling the left two-thirds of frame. Her expression shifts from neutral to a barely-perceptible smirk — the corner of her mouth lifts, her eyes narrow with quiet knowing intelligence. Cyan light pulses across her left cheekbone, golden light catches the right side of her face creating a chiaroscuro split-light effect. Her metallic shoulder piece glints gold. Background is pure darkness with faint out-of-focus cyan geometric lines. Extreme sharpness on her eyes and skin texture, shallow depth of field with creamy bokeh on everything behind her. Portrait photography style, editorial fashion, cinematic color grading with teal shadows and warm gold highlights. 4K cinematic quality, the face that proves character consistency.",
      },
      {
        mode: 'r2v',
        duration: 5,
        prompt: "Low-angle tracking shot from behind the same European woman with platinum blonde short hair as she walks away from camera down the same dark corridor. Her silhouette is sharp against a massive floor-to-ceiling window at the end of the hall revealing a neon-drenched cyberpunk cityscape in cyan and gold. Her shoulder blades move beneath the black top, faint cyan wrist tattoos visible as her arms swing. She glances back over her shoulder one last time — grey-blue eyes catch the light — then turns forward and disappears into the golden glare. Camera holds on the empty corridor, cyan lights pulsing once before fading. Anamorphic lens flare in gold, dramatic contrast, slow motion. Portrait photography style, editorial fashion. 4K cinematic quality, exit with lingering presence.",
      },
    ],
  },
  {
    id: 'demo_romance',
    totalDuration: 28,
    shots: [
      {
        mode: 't2v',
        duration: 7,
        prompt: "Cinematic wide shot of a young European woman with warm brown wavy hair falling past her shoulders, standing alone on a rooftop terrace at night. She has hazel-green eyes, faint freckles across her nose, wearing an oatmeal cashmere cardigan over a cream dress. Behind her a glittering city skyline stretches to the horizon with scattered lit windows like stars. A warm breeze lifts strands of her hair. She hugs her arms across her chest, looking up at the night sky with an expression of quiet longing — not sad, but on the verge of a decision. Soft golden bokeh from distant city lights, warm amber and midnight blue color grading, shallow depth of field separating her from the city. Gentle handheld camera sway adding intimacy. Portrait photography style, editorial fashion. 4K cinematic quality, solitary beauty and emotional anticipation.",
      },
      {
        mode: 'r2v',
        duration: 7,
        prompt: "Medium shot of the same young European woman with wavy brown hair and hazel-green eyes on the rooftop, her back still to camera, when she senses someone and turns. Her expression moves from surprise to recognition to a trembling half-smile. Over her shoulder we see a tall Southern European man in his early 30s with dark brown hair swept back, deep brown eyes, strong jaw with faint stubble, wearing a black-grey turtleneck sweater. He walks toward her slowly with his hands in his pockets, his usually cold expression softening into something vulnerable and unguarded. City lights flicker behind them. Camera dollies forward with him, rack focus from her face to his approaching figure then back to her. Golden warm lighting from rooftop string lights, cool blue ambient from the city below. Portrait photography style, editorial fashion. 4K cinematic quality, the moment before confession.",
      },
      {
        mode: 'r2v',
        duration: 8,
        prompt: "Intimate two-shot of the same couple facing each other on the rooftop, the city a soft blur of golden lights behind them. The woman with wavy brown hair looks up at the tall dark-haired man, tears glistening in her hazel-green eyes but a genuine smile breaking through. He reaches up and cups her face with one hand, thumb brushing away a tear, his deep brown eyes locked on hers with an intensity that says everything words cannot. She places her hand over his on her cheek. The rooftop string lights create warm halo bokeh around them. Camera slowly pushes in from medium shot to tight close-up of their faces nearly touching. Golden amber and soft rose color grading, shallow depth of field, the world fading away around them. Portrait photography style, editorial fashion. 4K cinematic quality, emotional climax and wordless confession.",
      },
      {
        mode: 'r2v',
        duration: 6,
        prompt: "Tender close-up of the same European couple in profile against the night sky. The dark-haired man leans down and presses his forehead to hers, both their eyes closed, his hand still cradling her jaw. She exhales a small breath — visible in the cool night air — and a single tear rolls down her freckled cheek, but she is smiling. The city below is completely out of focus, just warm amber bokeh. Camera holds still, letting the moment breathe without movement. Soft golden rim light traces their profiles. Intimate, quiet, earned. Portrait photography style, editorial fashion. 4K cinematic quality, the kiss doesn't need to be shown — this is the real moment.",
      },
    ],
  },
  {
    id: 'demo_warlord',
    totalDuration: 28,
    shots: [
      {
        mode: 't2v',
        duration: 7,
        prompt: "Cinematic wide shot of a rugged Eastern European man in his mid-30s stepping off a long-distance bus into a dusty American small-town station at golden hour. He has a military buzzcut, hawk-like grey eyes, a square jaw with a thin scar slicing across his left cheekbone, wearing a faded olive green M65 military jacket over a black tactical t-shirt, combat boots, faded unit patches on his sleeves. He carries a single olive duffel bag over one shoulder, and his eyes — cold, calculating — scan the rundown streets with trained tactical awareness. Faded store signs, old pickup trucks, and a grain silo in the distance. Harsh amber sunlight cuts through diesel exhaust and dust. Slow motion tracking shot following him through the station. Warm desaturated amber and dust tones, anamorphic lens flare, shallow depth of field isolating him from civilians. Portrait photography style, editorial fashion. 4K cinematic quality, the soldier comes home.",
      },
      {
        mode: 'r2v',
        duration: 7,
        prompt: "Intense medium shot inside a shabby apartment with peeling wallpaper. The same rugged man with grey eyes, buzzcut and scarred cheekbone kneels before his younger sister — a thin woman in her early 20s with the same grey eyes and light brown hair in a messy braid, dark circles under her eyes, wearing a faded floral blouse. She clutches a stack of red-stamped debt notices, hands trembling. Her face is bruised. His expression shifts through three stages in slow motion: shock to cold recognition to a terrifyingly quiet rage that is far more frightening than shouting. His jaw tightens, a vein pulses at his temple, his grey eyes darken to slate. Outside the window, black SUVs are parked. Warm tungsten interior light with cold blue from a single window, chiaroscuro from an overhead bare bulb. Portrait photography style, editorial fashion. 4K cinematic quality, the vow that precedes the storm.",
      },
      {
        mode: 'r2v',
        duration: 8,
        prompt: "Dynamic action sequence in a narrow dusty street lined with small shops at midday. The same muscular man with grey eyes and olive military jacket engages four armed thugs in close-quarters combat. Movements are fast, brutal, economical — he disarms the first with a wrist lock and elbow strike, uses a grabbed baseball bat to sweep two more, delivers a spinning back kick that drops the fourth through a wooden crate. Dust and debris explode with each impact. One attacker swings a crowbar — the soldier catches it mid-swing with his bare hand, snaps it away, and drops the man with a single palm strike to the chest. The camera mixes handheld tracking shots with brief slow-motion on key impacts: sweat droplets, splintering wood, the scar on his face catching sunlight. Warm dusty amber grading, harsh midday sun creating deep shadows, dust particles suspended in the air. Portrait photography style, editorial fashion. 4K cinematic quality, surgical violence and overwhelming skill.",
      },
      {
        mode: 'r2v',
        duration: 6,
        prompt: "Low-angle hero shot of the same scarred man with grey eyes standing amid a dozen groaning bodies scattered across the street. Barely winded, he adjusts his jacket collar with casual indifference, knuckles bloodied but not a scratch on his face. Behind him, his sister peeks through a shattered restaurant door — eyes wide with awe and relief. The soldier turns toward camera — toward her — and the ghost of a gentle smile crosses his scarred face, utterly at odds with the devastation around him. Dust motes settle in golden sunbeams. Camera looks up from street level, making him monumental against the deep blue sky. Warm golden afternoon light, shallow depth of field with soft bokeh on the fallen. Portrait photography style, editorial fashion. 4K cinematic quality, one man against the world — and winning.",
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

  const input = { prompt };
  if (mode === 'r2v' && refImgUrl) {
    input.media = [{ url: refImgUrl }];
  }

  const body = {
    model,
    input,
    parameters: { size: '720*1280', duration },
  };

  log(demoId, `Shot ${shotLabel}: 提交任务 (model=${model}, duration=${duration}s)`);

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

    // PENDING / RUNNING 继续轮询
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
  const { id, shots, totalDuration } = demo;
  const outDir = join(OUTPUT_BASE, `${id}_${totalDuration}s`);
  mkdirSync(outDir, { recursive: true });

  log(id, `开始生成 — ${shots.length} 个镜头，输出: ${outDir}`);

  const errors = [];
  const shotFiles = [];
  let refImgDataUrl = null;

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

        // 提交任务
        const refUrl = shot.mode === 'r2v' ? refImgDataUrl : null;
        const taskId = await submit(
          shot.prompt, shot.mode, shot.duration, refUrl, id, shotLabel,
        );

        // 等 2s 再轮询
        await sleep(2000);

        // 轮询等待完成
        const result = await poll(taskId, id, shotLabel);
        if (result.status !== 'completed') throw new Error('非预期状态');

        // 下载视频
        log(id, `Shot ${shotLabel}: 下载中...`);
        await download(result.videoUrl, videoPath);
        log(id, `Shot ${shotLabel}: DONE → shot_${num}.mp4`);

        shotFiles.push(`shot_${num}.mp4`);

        // Shot 1 完成后提取首帧供后续 r2v 使用
        if (i === 0) {
          const framePath = join(outDir, 'frame_01.jpg');
          log(id, `Shot ${shotLabel}: 提取首帧...`);
          extractFrame(videoPath, framePath);
          refImgDataUrl = base64Encode(framePath);
          log(id, `Shot ${shotLabel}: 首帧 base64 编码完成`);
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

  // ffmpeg 拼接
  if (shotFiles.length === 0) {
    log(id, '所有镜头均失败，跳过拼接');
    return { id, shots: shots.length, shotFiles, final: null, status: 'failed', errors };
  }

  const concatPath = join(outDir, 'concat_list.txt');
  const concatContent = shotFiles.map((f) => `file '${f}'`).join('\n') + '\n';
  writeFileSync(concatPath, concatContent);

  const finalName = `final_${totalDuration}s.mp4`;
  const finalPath = join(outDir, finalName);

  try {
    log(id, `拼接 ${shotFiles.length} 个片段 → ${finalName}`);
    execSync(
      `${FFMPEG} -y -f concat -safe 0 -i "${concatPath}" -c copy "${finalPath}"`,
      { stdio: 'pipe' },
    );
    log(id, `拼接完成 → ${finalName}`);
  } catch (err) {
    log(id, `拼接失败: ${err.message}`);
    errors.push({ shot: 'concat', error: err.message });
    return { id, shots: shots.length, shotFiles, final: null, status: 'partial', errors };
  }

  return {
    id,
    shots: shots.length,
    shotFiles,
    final: finalName,
    status: errors.length > 0 ? 'partial' : 'completed',
    errors,
  };
}

// ─── 入口 ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log(' ReelRay 样片生成器');
  console.log(` 输出目录: ${OUTPUT_BASE}`);
  console.log(` 样片数量: ${DEMOS.length}`);
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

  // 写入 manifest.json
  const manifest = {
    generated_at: new Date().toISOString(),
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

  // 汇总表
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
