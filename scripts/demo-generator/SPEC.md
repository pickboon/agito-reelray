# ReelRay 样片生成 — Codex CLI SPEC

## 目标

在 `/Users/mac/Projects/agito-reelray/scripts/demo-generator/` 下创建一个独立的 Node.js 脚本，批量为 ReelRay 平台生成 Banner + 精品样片视频。

## 输出目录

```
/Users/mac/Projects/agito-reelray/public/demos/v2/
├── banner_hero_15s/       # Banner: shot_01.mp4, shot_02.mp4, shot_03.mp4, final_15s.mp4
├── demo_romance_28s/      # 都市情感: shot_01.mp4 ... shot_04.mp4, final_28s.mp4
├── demo_warlord_28s/      # 战神格斗: shot_01.mp4 ... shot_04.mp4, final_28s.mp4
└── manifest.json          # 全量元数据
```

## 技术约束

| 项 | 值 |
|----|-----|
| API 端点 | `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis` |
| 轮询端点 | `GET https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}` |
| API Key | `sk-ws-H.RYEEIPH.IvKl.MEQCIDl-mkf-ySARvvYE_T2aubgBaj9mUiF87G5WMJFXU-snAiAnOGoTufoyRyGoYFJYVHQf9aYmmP5WjBr9_3Q0k8c1Vg` |
| 认证头 | `Authorization: Bearer {KEY}` + `X-DashScope-Async: enable` |
| size 格式 | `720*1280`（星号不是 x，9:16 竖屏） |
| duration | 整数秒（非浮点） |
| 模型 | t2v: `happyhorse-1.1-t2v`, r2v: `happyhorse-1.1-r2v` |
| r2v 参考图 | `input.ref_img_url` 字段，支持 `data:image/jpeg;base64,...` 格式 |
| 工作模式 | 纯轮询，每 5s 查一次，最多 40 次（200s） |
| 下载 | 视频 URL 有时效性，拿到后立即下载 |
| ffmpeg | 已安装在 `/opt/homebrew/bin/ffmpeg` (v8.1.2) |

## 角色锚定管线（base64 data URL，替代 R2 上传）

每个样片内部流程：
1. Shot 1 用 t2v 模式生成
2. 下载视频到本地
3. `ffmpeg -i shot_01.mp4 -frames:v 1 -q:v 2 frame_01.jpg` 提取首帧
4. `base64 -i frame_01.jpg` → 组装 `data:image/jpeg;base64,{BASE64_STRING}`
5. Shot 2-N 全部用 r2v 模式，`ref_img_url` 传 base64 data URL
6. 每个 shot 完成后下载的视频保存为 `shot_{N}.mp4`
7. 最后用 ffmpeg concat 拼接所有 shot 为 `final.mp4`

## 三条样片 Prompt 配置

### 1. Banner Hero — 3 镜

```
id: "banner_hero"
shots:
  - mode: t2v, duration: 5
    prompt: "Cinematic wide shot of a striking European woman in her late 20s walking through a dark futuristic corridor, floor-to-ceiling black marble walls with thin cyan LED light strips running horizontally at eye level. She has platinum blonde short hair slicked back, piercing grey-blue eyes, sharp cheekbones, wearing a black high-neck sleeveless top with metallic shoulder armor pieces, faint cyan circuit-like tattoos glowing on her wrists. She walks toward camera with slow deliberate strides, her figure silhouetted against a massive holographic golden light source behind her. Cyan rim lighting traces her jawline and collarbone, golden backlight creates a halo. Floating dust particles catch the cyan beams. Anamorphic lens, shallow depth of field, slow motion. Dark sci-fi luxury aesthetic, portrait photography style, editorial fashion. 4K cinematic quality, powerful entrance and controlled menace."
  - mode: r2v, duration: 5
    prompt: "Medium close-up of the same European woman with platinum blonde slicked-back hair and grey-blue eyes, face filling the left two-thirds of frame. Her expression shifts from neutral to a barely-perceptible smirk — the corner of her mouth lifts, her eyes narrow with quiet knowing intelligence. Cyan light pulses across her left cheekbone, golden light catches the right side of her face creating a chiaroscuro split-light effect. Her metallic shoulder piece glints gold. Background is pure darkness with faint out-of-focus cyan geometric lines. Extreme sharpness on her eyes and skin texture, shallow depth of field with creamy bokeh on everything behind her. Portrait photography style, editorial fashion, cinematic color grading with teal shadows and warm gold highlights. 4K cinematic quality, the face that proves character consistency."
  - mode: r2v, duration: 5
    prompt: "Low-angle tracking shot from behind the same European woman with platinum blonde short hair as she walks away from camera down the same dark corridor. Her silhouette is sharp against a massive floor-to-ceiling window at the end of the hall revealing a neon-drenched cyberpunk cityscape in cyan and gold. Her shoulder blades move beneath the black top, faint cyan wrist tattoos visible as her arms swing. She glances back over her shoulder one last time — grey-blue eyes catch the light — then turns forward and disappears into the golden glare. Camera holds on the empty corridor, cyan lights pulsing once before fading. Anamorphic lens flare in gold, dramatic contrast, slow motion. Portrait photography style, editorial fashion. 4K cinematic quality, exit with lingering presence."
```

### 2. 都市情感告白 — 4 镜

```
id: "demo_romance"
shots:
  - mode: t2v, duration: 7
    prompt: "Cinematic wide shot of a young European woman with warm brown wavy hair falling past her shoulders, standing alone on a rooftop terrace at night. She has hazel-green eyes, faint freckles across her nose, wearing an oatmeal cashmere cardigan over a cream dress. Behind her a glittering city skyline stretches to the horizon with scattered lit windows like stars. A warm breeze lifts strands of her hair. She hugs her arms across her chest, looking up at the night sky with an expression of quiet longing — not sad, but on the verge of a decision. Soft golden bokeh from distant city lights, warm amber and midnight blue color grading, shallow depth of field separating her from the city. Gentle handheld camera sway adding intimacy. Portrait photography style, editorial fashion. 4K cinematic quality, solitary beauty and emotional anticipation."
  - mode: r2v, duration: 7
    prompt: "Medium shot of the same young European woman with wavy brown hair and hazel-green eyes on the rooftop, her back still to camera, when she senses someone and turns. Her expression moves from surprise to recognition to a trembling half-smile. Over her shoulder we see a tall Southern European man in his early 30s with dark brown hair swept back, deep brown eyes, strong jaw with faint stubble, wearing a black-grey turtleneck sweater. He walks toward her slowly with his hands in his pockets, his usually cold expression softening into something vulnerable and unguarded. City lights flicker behind them. Camera dollies forward with him, rack focus from her face to his approaching figure then back to her. Golden warm lighting from rooftop string lights, cool blue ambient from the city below. Portrait photography style, editorial fashion. 4K cinematic quality, the moment before confession."
  - mode: r2v, duration: 8
    prompt: "Intimate two-shot of the same couple facing each other on the rooftop, the city a soft blur of golden lights behind them. The woman with wavy brown hair looks up at the tall dark-haired man, tears glistening in her hazel-green eyes but a genuine smile breaking through. He reaches up and cups her face with one hand, thumb brushing away a tear, his deep brown eyes locked on hers with an intensity that says everything words cannot. She places her hand over his on her cheek. The rooftop string lights create warm halo bokeh around them. Camera slowly pushes in from medium shot to tight close-up of their faces nearly touching. Golden amber and soft rose color grading, shallow depth of field, the world fading away around them. Portrait photography style, editorial fashion. 4K cinematic quality, emotional climax and wordless confession."
  - mode: r2v, duration: 6
    prompt: "Tender close-up of the same European couple in profile against the night sky. The dark-haired man leans down and presses his forehead to hers, both their eyes closed, his hand still cradling her jaw. She exhales a small breath — visible in the cool night air — and a single tear rolls down her freckled cheek, but she is smiling. The city below is completely out of focus, just warm amber bokeh. Camera holds still, letting the moment breathe without movement. Soft golden rim light traces their profiles. Intimate, quiet, earned. Portrait photography style, editorial fashion. 4K cinematic quality, the kiss doesn't need to be shown — this is the real moment."
```

### 3. 战神格斗 — 4 镜

```
id: "demo_warlord"
shots:
  - mode: t2v, duration: 7
    prompt: "Cinematic wide shot of a rugged Eastern European man in his mid-30s stepping off a long-distance bus into a dusty American small-town station at golden hour. He has a military buzzcut, hawk-like grey eyes, a square jaw with a thin scar slicing across his left cheekbone, wearing a faded olive green M65 military jacket over a black tactical t-shirt, combat boots, faded unit patches on his sleeves. He carries a single olive duffel bag over one shoulder, and his eyes — cold, calculating — scan the rundown streets with trained tactical awareness. Faded store signs, old pickup trucks, and a grain silo in the distance. Harsh amber sunlight cuts through diesel exhaust and dust. Slow motion tracking shot following him through the station. Warm desaturated amber and dust tones, anamorphic lens flare, shallow depth of field isolating him from civilians. Portrait photography style, editorial fashion. 4K cinematic quality, the soldier comes home."
  - mode: r2v, duration: 7
    prompt: "Intense medium shot inside a shabby apartment with peeling wallpaper. The same rugged man with grey eyes, buzzcut and scarred cheekbone kneels before his younger sister — a thin woman in her early 20s with the same grey eyes and light brown hair in a messy braid, dark circles under her eyes, wearing a faded floral blouse. She clutches a stack of red-stamped debt notices, hands trembling. Her face is bruised. His expression shifts through three stages in slow motion: shock to cold recognition to a terrifyingly quiet rage that is far more frightening than shouting. His jaw tightens, a vein pulses at his temple, his grey eyes darken to slate. Outside the window, black SUVs are parked. Warm tungsten interior light with cold blue from a single window, chiaroscuro from an overhead bare bulb. Portrait photography style, editorial fashion. 4K cinematic quality, the vow that precedes the storm."
  - mode: r2v, duration: 8
    prompt: "Dynamic action sequence in a narrow dusty street lined with small shops at midday. The same muscular man with grey eyes and olive military jacket engages four armed thugs in close-quarters combat. Movements are fast, brutal, economical — he disarms the first with a wrist lock and elbow strike, uses a grabbed baseball bat to sweep two more, delivers a spinning back kick that drops the fourth through a wooden crate. Dust and debris explode with each impact. One attacker swings a crowbar — the soldier catches it mid-swing with his bare hand, snaps it away, and drops the man with a single palm strike to the chest. The camera mixes handheld tracking shots with brief slow-motion on key impacts: sweat droplets, splintering wood, the scar on his face catching sunlight. Warm dusty amber grading, harsh midday sun creating deep shadows, dust particles suspended in the air. Portrait photography style, editorial fashion. 4K cinematic quality, surgical violence and overwhelming skill."
  - mode: r2v, duration: 6
    prompt: "Low-angle hero shot of the same scarred man with grey eyes standing amid a dozen groaning bodies scattered across the street. Barely winded, he adjusts his jacket collar with casual indifference, knuckles bloodied but not a scratch on his face. Behind him, his sister peeks through a shattered restaurant door — eyes wide with awe and relief. The soldier turns toward camera — toward her — and the ghost of a gentle smile crosses his scarred face, utterly at odds with the devastation around him. Dust motes settle in golden sunbeams. Camera looks up from street level, making him monumental against the deep blue sky. Warm golden afternoon light, shallow depth of field with soft bokeh on the fallen. Portrait photography style, editorial fashion. 4K cinematic quality, one man against the world — and winning."
```

## 脚本架构

单文件 `generate.mjs`（ESM），自包含。结构：

```
1. CONFIG: 三个 demo 对象的数组（id, shots 数组）
2. submit(prompt, mode, refImgUrl?) → taskId
3. poll(taskId) → { status, videoUrl }
4. download(url, filepath)
5. extractFrame(videoPath, jpgPath) — 调 ffmpeg
6. base64Encode(jpgPath) → data URL string
7. generateDemo(demoConfig) — 主导流程
8. main() — 遍历三个 demo，顺序执行
```

关键逻辑：
- 每个 demo 的 Shot 1 必须是 t2v，完成后提取首帧
- Shot 2-N 用 r2v，全部传同一个 base64 data URL
- 每个 shot 提交后轮询，完成后立刻下载视频
- 全部 shot 完成后，ffmpeg concat 拼接
- 错误处理：单个 demo 失败不阻塞其他 demo；每个 shot 最多 2 次重试

## 拼接命令（ffmpeg concat）

```
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy final.mp4
```

concat_list.txt 格式：
```
file 'shot_01.mp4'
file 'shot_02.mp4'
file 'shot_03.mp4'
...
```

## 输出 manifest.json

```json
{
  "generated_at": "ISO timestamp",
  "demos": [
    {
      "id": "banner_hero",
      "shots": 3,
      "shot_videos": ["shot_01.mp4", "shot_02.mp4", "shot_03.mp4"],
      "final": "final_15s.mp4",
      "status": "completed",
      "errors": []
    }
  ]
}
```

## 运行方式

```bash
cd /Users/mac/Projects/agito-reelray/scripts/demo-generator
node generate.mjs
```

## 注意事项

1. 使用原生 `fetch` (Node 18+) 
2. 使用 `child_process.spawn` / `execSync` 调 ffmpeg
3. 使用 `fs.readFileSync` + `Buffer.toString('base64')` 做 base64
4. 进度日志用 `console.log`，但要求显示当前 demo / shot / 状态（submitted / polling / downloading / extracting / complete）
5. 视频文件可能几十 MB，下载用 stream pipeline
6. 每次 submit 后 sleep 2s 再开始轮询（避免状态未就绪）
7. 轮询间隔 5s，最多 40 次
8. API 超时设 60s（提交）/ 30s（轮询）
9. 如果遇到 HTTP 429 或 5xx，等待 10s 后重试
