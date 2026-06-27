# 极光 ReelRay Phase 1 — SPEC v3（最终版）

> **基于**: 平台形态推演报告 + 技术可行性白皮书 + 定价模型推演 + 模板/流水线/智能助手/多模型策略
> **日期**: 2026-06-27 | **目标**: 出海短剧角色锁定生成工具 MVP

---

## 一、产品定位

### 做
- ✅ 角色锁定生成引擎（r2v 锚定 + Prompt 工程，核心卖点）
- ✅ 多语种版本自动生成（HappyHorse 1.1 原生 7 语言唇同步）
- ✅ 海外平台直出格式（TikTok 9:16 竖屏 / YouTube 16:9 横屏，一键适配）
- ✅ **出海短剧预设模板（复仇/甜宠/悬疑/奇幻，含角色蓝图+场景库+调色预设）**
- ✅ **嵌入式智能策划助手（每环节侧边栏 AI 建议，LLM 调用成本可忽略）**
- ✅ **模块化生成流水线架构（每环节独立 API，可替换，Phase 2 可扩展）**
- ✅ **Credit 积分制定价（统一计量 + 套餐折扣 + 资源包预付费）**

### 不做
- ❌ 全链路工具（剧本编辑器、分镜管理、协作审改 — 打不过 Catimind/万兴）
- ❌ 自建分发平台（不自建 APP，不跟 ReelShort/TikTok 抢渠道）
- ❌ 社区/剧本交易/认证体系（精力分散，无差异化）
- ❌ 纯订阅制付费（订阅制陷阱：客户用多了平台亏，客户用少了觉得不值）

### 差异化一句话
**「出海短剧的角色锁定 + 多语种生成 + 一键分发格式，做窄做透。其他都不做。」**

---

## 二、定价体系（Credit 积分制）

### 2.1 核心逻辑

```
客户支付 ¥ → 获得 Credits → 消耗 Credits → 调用 HappyHorse API → 产生视频

标准汇率：¥1 = 100 Credits

不同操作消耗不同 Credits：
  • 1 集短剧 720p（2 分钟）  = 10,000 Credits（¥100/集）
  • 1 集短剧 1080p（2 分钟） = 15,000 Credits（¥150/集）
  • 1 次角色参考图生成        = 50 Credits
  • 1 次多语种配音（每语言）  = 500 Credits
  • 1 次质量评分（LLM）       = 1 Credit
  • 1 次智能助手建议（LLM）   = 0.5 Credits（基本免费）
```

### 2.2 套餐（含折扣 Credits）

| 套餐 | 月费 | Credits | 等效集数（720p） | 折扣率 | 目标客户 |
|------|------|---------|-----------------|--------|---------|
| **Free** | ¥0 | 1,000（试用） | 0.1 集（试用片段） | — | 体验 |
| **Starter** | ¥149 | 20,000 | 2 集 | 25% off | 个人创作者 |
| **Pro** | ¥499 | 80,000 | 8 集 | 38% off | 小型工作室 |
| **Studio** | ¥1,499 | 300,000 | 30 集 | 50% off | 中型工作室 |

### 2.3 资源包（预付费，无月费，用完结）

| 资源包 | 价格 | Credits | 等效集数（720p） | 折扣率 |
|--------|------|---------|-----------------|--------|
| **Small** | ¥500 | 45,000 | 4.5 集 | 小溢价（¥1.11/100Cr） |
| **Medium** | ¥2,000 | 200,000 | 20 集 | 标准汇率（¥1/100Cr） |
| **Large** | ¥5,000 | 600,000 | 60 集 | 折扣（¥0.83/100Cr） |

### 2.4 超额计费

- 套餐额度用完后，按标准汇率 **¥1/100 Credits** 自动扣费
- 客户可设置月度消费上限（默认 ¥5,000）
- 不会像 Coding Plan 那样超量直接限速——生产工具不能断

### 2.5 定价策略优势

- **汇率杠杆**：HappyHorse 涨价 30%，调 Credits 消耗数即可，不改套餐价格
- **多模型适配自由**：Seedance 接入后消耗更少 Credits，客户自然选择更便宜的模型
- **团队共享**：Credits 池化，工作室团队共用额度
- **现金流**：资源包 ¥500-5,000 预收，改善现金流
- **客户感知**：Free Tier 零风险试，¥149 起步门槛低，超额不停机

---

## 三、出海短剧预设模板

Phase 1 内置 4 套模板，对应出海短剧四大主流题材。

### 3.1 模板矩阵

| 模板 | 题材 | 目标市场 | 预置内容 |
|------|------|---------|---------|
| **Revenge** | 霸总/豪门/重生 | 北美/东南亚 | 角色蓝图（总裁/女主/反派）、场景库（豪宅/办公室/宴会）、调色预设（冷色调高对比度）、分镜节奏模板（快节奏反转） |
| **Romance** | 先婚后爱/契约恋爱 | 全球 | 角色蓝图（暖男/甜妹）、场景库（咖啡厅/公寓/海边）、调色预设（暖色调柔光）、BGM 情绪曲线 |
| **Thriller** | 犯罪/恐怖/反转 | 北美/拉美 | 角色蓝图（侦探/嫌疑人/受害者）、场景库（暗巷/废弃工厂/警局）、调色预设（低饱和度暗调）、镜头语言模板（跳切/窥视镜头） |
| **Fantasy** | 穿越/异世界/修仙 | 东南亚/拉美 | 角色蓝图（主角/导师/魔王）、场景库（宫殿/森林/战场）、调色预设（高饱和奇幻风）、特效提示词库 |

### 3.2 每套模板结构

```typescript
interface Template {
  id: string;
  name: string;
  genre: "revenge" | "romance" | "thriller" | "fantasy";
  target_markets: string[];
  character_blueprints: CharacterBlueprint[];  // 角色 Prompt 模板
  scene_library: ScenePreset[];                 // 场景 Prompt 模板
  color_grade: ColorPreset;                     // 调色/LUT 预设
  shot_rhythm: ShotRhythmTemplate;              // 分镜节奏模板
  prompt_templates: Record<string, string>;     // 多语种 Prompt 模板
}
```

### 3.3 模板使用流程

1. 创建项目时选择模板（或空白项目）
2. 系统自动填充角色蓝图 + 场景库
3. 客户可修改/删除/新增角色
4. 生成时 Prompt 自动注入模板的调色预设和镜头语言
5. 模板可保存为自定义模板（Phase 2）

---

## 四、模块化生成流水线

### 4.1 架构

```
┌──────────────────────────────────────────────────────────┐
│                  ReelRay Pipeline                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ 文字生图  │ →  │ 角色锚定  │ →  │ 视频生成  │ → 导出     │
│  │ (可选)   │    │ (r2v)    │    │ (t2v/r2v) │            │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│       │               │               │                   │
│  ┌────▼───────────────▼───────────────▼─────┐             │
│  │          智能策划助手（嵌入每个环节）       │             │
│  │  • 剧本分析 → 角色建议 → 分镜建议          │             │
│  │  • 生成前预检 → 生成后质量评分             │             │
│  └──────────────────────────────────────────┘             │
│                                                           │
│  ┌──────────────────────────────────────────┐             │
│  │         Model Adapter Layer               │             │
│  │  ┌──────────────┐  ┌──────────────┐      │             │
│  │  │ HappyHorse   │  │ Seedance     │ ...  │             │
│  │  │ Adapter      │  │ Adapter (P2) │      │             │
│  │  │ (Phase 1)    │  │              │      │             │
│  │  └──────────────┘  └──────────────┘      │             │
│  └──────────────────────────────────────────┘             │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Phase 1 实现范围

- **核心链路**：角色锚定（r2v）→ 视频生成（t2v + r2v）→ 基础导出
- **Phase 2 扩展**：文字生图（Midjourney/Stable Diffusion API）、多语种配音管线、视频合成（多镜头拼接）
- Phase 1 不做的环节在 UI 上显示为「Coming Soon」占位，但架构已预留接口

### 4.3 环节独立性

每个环节是独立 API 端点，可独立调用、独立替换：

```
POST /api/pipeline/generate-image     →  文字生图（Phase 2）
POST /api/pipeline/anchor-character   →  r2v 角色锚定
POST /api/pipeline/generate-shot      →  t2v/r2v 视频生成
POST /api/pipeline/dub                →  多语种配音（Phase 2）
POST /api/pipeline/assemble           →  视频合成（Phase 2）
```

---

## 五、多模型适配器架构

### 5.1 设计原则

**Phase 1 只接入 HappyHorse，但架构从第一天就预留多模型。**

### 5.2 Adapter 接口

```typescript
interface IVideoModelAdapter {
  readonly modelId: string;
  readonly displayName: string;
  readonly capabilities: ModelCapabilities;

  submit(params: GenerateParams): Promise<SubmitResult>;
  poll(taskId: string): Promise<PollResult>;
  getStatus(taskId: string): Promise<TaskStatus>;
  getCost(params: GenerateParams): Promise<CostEstimate>;
  getCapabilities(): ModelCapabilities;
}

interface ModelCapabilities {
  t2v: boolean;
  r2v: boolean;
  maxDuration: number;        // 最长生成秒数
  supportedAspectRatios: string[];
  maxReferenceImages: number; // r2v 最多参考图
  nativeAudio: boolean;       // 原生音频
  lipSyncLanguages: string[]; // 唇同步语言
}
```

### 5.3 Phase 1 实现

```typescript
class HappyHorseAdapter implements IVideoModelAdapter {
  readonly modelId = "happyhorse";
  readonly displayName = "HappyHorse 1.1";
  readonly capabilities = {
    t2v: true, r2v: true,
    maxDuration: 15,          // 实测最长 15 秒/段
    supportedAspectRatios: ["16:9", "9:16", "1:1"],
    maxReferenceImages: 9,
    nativeAudio: true,
    lipSyncLanguages: ["zh", "en", "ja", "ko", "es", "fr", "pt"],
  };

  async submit(params) { /* 百炼 API 提交 */ }
  async poll(taskId)   { /* 轮询任务状态 */ }
  // ...
}
```

### 5.4 Phase 2 预留

```typescript
// 已预留接口，无需改架构
class SeedanceAdapter implements IVideoModelAdapter { /* ... */ }
class KlingAdapter implements IVideoModelAdapter    { /* ... */ }
```

### 5.5 模型选择逻辑

```
generation_logs.model 字段记录使用的模型
客户端可选择模型（默认 HappyHorse）
不同模型消耗不同 Credits → 客户自然选择性价比最高的
```

---

## 六、嵌入式智能策划助手

### 6.1 设计理念

不是独立功能，是**嵌入每个环节的侧边栏 AI 顾问面板**。不遮挡不打断，但随时可查。

### 6.2 各环节智能建议

| 环节 | 触发时机 | 建议内容 | LLM 成本 |
|------|---------|---------|---------|
| **剧本输入** | 客户粘贴/输入剧本后 | 自动分析剧本结构：识别角色数、场景数、镜头数；推荐匹配模板；标记潜在问题（角色过多、场景切换频繁） | ~¥0.01 |
| **角色设定** | 添加/编辑角色时 | 基于剧本自动生成角色 Prompt 建议；推荐匹配的参考图风格；提示「这个描述可能在 r2v 中表现不稳定」 | ~¥0.01-0.02 |
| **分镜拆解** | 创建集/镜头时 | 自动建议分镜方案；对每个镜头建议类型、景别、时长；提示「建议拆成两个镜头」 | ~¥0.01 |
| **生成提交前** | 点击 Generate 前 | 预检：检查 Prompt 长度、复杂度、seed 策略；预估生成时间和 Credits 消耗；提示风险（如「这个 Prompt 可能触发内容安全审核」） | 纯规则，0 |
| **生成完成后** | 镜头完成时 | 自动评分（1-5 星）；对比角色参考图一致性；标记可能的问题镜头（「建议重新生成」） | ~¥0.01 |

### 6.3 UI 形态

```
┌──────────────────────────────────────────┐
│  MAIN CONTENT                    ┌──────┐│
│  ┌────────────────────────────┐  │ 💡   ││
│  │ Episode 1 · Shot #2        │  │──────││
│  │ Prompt Editor              │  │Atlas ││
│  │ ┌────────────────────────┐ │  │建议   ││
│  │ │ Lena walks slowly...   │ │  │──────││
│  │ │                        │ │  │      ││
│  │ └────────────────────────┘ │  │ ⚠️   ││
│  │                            │  │ 这个  ││
│  │ [Generate]  [Preview]      │  │ 镜头  ││
│  └────────────────────────────┘  │ 建议  ││
│                                  │ 拆成  ││
│                                  │ 两个  ││
│                                  │ ...   ││
│                                  └──────┘│
└──────────────────────────────────────────┘
```

- 侧边栏默认折叠，点击展开
- 仅在相关环节显示相关建议
- 建议风格：冷静、专业、直接，不废话（对齐 Atlas 风格）

### 6.4 实现方式

- 前端：Shadcn/ui Sheet 组件（侧边栏面板）
- 后端：调用 DeepSeek-V4（成本极低，¥0.001/次）
- 缓存：相同剧本+角色组合的建议缓存 24 小时
- **总成本**：单集全流程 LLM 调用约 ¥0.05-0.10，基本免费

---

## 七、技术栈

| 层 | 选型 | 复用来源 |
|----|------|---------|
| 框架 | Next.js 15.5 (App Router) | 极智平台 |
| UI | React 19 + TailwindCSS 4 + Shadcn/ui | 极智平台 |
| 认证 | Supabase Auth (GitHub OAuth) | 极智平台 |
| 数据库 | Supabase (PostgreSQL) | 极智平台 |
| 存储 | Cloudflare R2 (视频 + 参考图) | 新建 |
| 支付 | Stripe Checkout + Webhook（接入 Credits 体系） | 极智平台 |
| 部署 | Cloudflare Pages | 极智平台 |
| AI 视频 | HappyHorse 1.1 (t2v + r2v) | Phase 0 已验证 |
| AI 文本 | DeepSeek-V4（智能助手、质量评分） | 新建 |

---

## 八、视觉设计

### 8.1 设计语言
- **暗色模式**：深蓝黑底 `#0a0a1a`，赛博 HUD 风格
- **主色**：明亮科幻金 `#FACC15`（品牌主色）
- **辅色**：赛博青 `#00F0FF`（交互/高亮）
- **动画**：微光扫描线、霓虹光晕、终端光标闪烁
- **字体**：系统等宽字体（JetBrains Mono / Fira Code）

### 8.2 与极智平台的区别
- 暗色主题 + 赛博 HUD 风格与极智一致
- ReelRay 更偏「出海/国际化」—— 默认英文 UI，支持中文切换
- 品牌色：极智用青色为主，极光用金色为主，形成视觉区分

---

## 九、页面路由

```
/                       Landing Page（产品介绍 + 定价 + CTA）
/login                  登录（GitHub OAuth）
/dashboard              项目仪表盘（登录后首页）
/dashboard/projects     项目列表
/dashboard/projects/[id] 项目详情（角色管理 + 集列表 + 模板选择）
/dashboard/projects/[id]/episodes/[ep] 集详情（镜头列表 + 生成状态 + 智能助手）
/dashboard/projects/[id]/episodes/[ep]/shots/[shot] 镜头详情（预览 + 参数）
/pricing                定价页
/api/generate           生成 API（POST 提交 + GET 轮询）
/api/pipeline/*         流水线各环节 API
/api/assistant/*        智能助手 API
/api/stripe/webhook     Stripe Webhook
/api/stripe/credits     额度查询/消费 API
```

**仅 12 个路由**，不做 `/admin`、`/articles`、`/community` 等附加模块。

---

## 十、数据模型（7 张表）

### 10.1 `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  template_id TEXT,                     -- 模板 ID（revenge/romance/thriller/fantasy/null）
  target_languages TEXT[] DEFAULT '{en}',
  aspect_ratio TEXT DEFAULT '9:16',     -- 9:16 TikTok / 16:9 YouTube
  status TEXT DEFAULT 'draft',          -- draft / generating / completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.2 `characters`
```sql
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,            -- 角色描述（Prompt 用）
  reference_image_url TEXT,             -- 角色参考图（R2 URL）
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.3 `episodes`
```sql
CREATE TABLE episodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'draft',          -- draft / generating / completed
  duration_seconds INTEGER DEFAULT 120, -- 目标时长（秒）
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.4 `shots`
```sql
CREATE TABLE shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  prompt TEXT NOT NULL,                 -- 生成 Prompt
  model TEXT DEFAULT 'happyhorse-1.1-t2v',
  mode TEXT DEFAULT 't2v',              -- t2v / r2v
  reference_character_id UUID REFERENCES characters(id),
  aspect_ratio TEXT DEFAULT '9:16',
  duration INTEGER DEFAULT 5,           -- 秒
  seed INTEGER,
  status TEXT DEFAULT 'pending',        -- pending / submitted / running / completed / failed
  task_id TEXT,                         -- HappyHorse 异步 task_id
  video_url TEXT,                       -- 生成结果 URL
  thumbnail_url TEXT,                   -- 缩略图
  quality_score INTEGER,                -- 智能助手评分（1-5）
  error_message TEXT,
  elapsed_seconds INTEGER,
  retry_count INTEGER DEFAULT 0,
  credits_consumed INTEGER DEFAULT 0,   -- 消耗 Credits
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.5 `generation_logs`
```sql
CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shot_id UUID NOT NULL REFERENCES shots(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  mode TEXT NOT NULL,
  task_id TEXT,
  status TEXT NOT NULL,
  video_url TEXT,
  error_message TEXT,
  elapsed_seconds INTEGER,
  credits_consumed INTEGER DEFAULT 0,
  cost_estimate REAL,                   -- 预估 API 成本（元）
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.6 `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free',             -- free / starter / pro / studio
  credits_remaining INTEGER DEFAULT 0,  -- 剩余 Credits
  credits_total INTEGER DEFAULT 0,      -- 套餐总 Credits
  monthly_spending_cap INTEGER DEFAULT 500000, -- 月度消费上限（Credits）
  status TEXT DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 10.7 `credit_transactions`
```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,                   -- purchase / consume / refund / bonus
  amount INTEGER NOT NULL,              -- Credits 变动（正=增加，负=消耗）
  balance_after INTEGER NOT NULL,       -- 变动后余额
  description TEXT,                     -- 业务描述
  reference_id TEXT,                    -- 关联 shot_id / stripe_session_id
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 十一、API 设计

### 11.1 视频生成

```typescript
// POST /api/generate
{
  shot_id: string;
  model: "happyhorse-1.1-t2v" | "happyhorse-1.1-r2v";
  mode: "t2v" | "r2v";
  prompt: string;
  reference_image_url?: string;  // r2v 模式必填
  aspect_ratio: "9:16" | "16:9";
  duration: number;              // 秒，整数
  seed?: number;
}

// Response 200
{ task_id: string; shot_id: string; status: "submitted"; credits_consumed: number; }

// GET /api/generate?taskId=xxx
// Response 200
{ task_id: string; status: "running" | "completed" | "failed"; video_url?: string; error_message?: string; elapsed_seconds: number; }
```

### 11.2 智能助手

```typescript
// POST /api/assistant/analyze-script
{ script: string; } → { characters: AnalysisResult[]; scenes: AnalysisResult[]; suggestions: string[]; }

// POST /api/assistant/suggest-character
{ script: string; character_name: string; } → { prompt_suggestion: string; style_suggestion: string; warnings: string[]; }

// POST /api/assistant/suggest-shots
{ script: string; characters: Character[]; } → { shots: ShotSuggestion[]; }

// POST /api/assistant/precheck
{ shot_id: string; prompt: string; } → { warnings: CheckResult[]; estimated_time: number; estimated_credits: number; }

// POST /api/assistant/score
{ shot_id: string; video_url: string; reference_image_url?: string; } → { score: number; feedback: string; }
```

### 11.3 Credits / 额度

```typescript
// GET /api/stripe/credits
// Response 200
{ credits_remaining: number; plan: string; monthly_cap: number; }

// POST /api/stripe/credits/consume
{ shot_id: string; credits: number; } → { success: boolean; credits_remaining: number; }
```

### 11.4 生成逻辑（后端）

```
1. 校验 shot 状态 + 用户 Credits 额度
2. 构造 HappyHorse API 请求（含 model/mode/prompt/media/size/duration/seed）
3. 提交异步任务 → 获取 task_id
4. 更新 shots 表（status=submitted, task_id）
5. 扣除 Credits → 写入 credit_transactions
6. 写入 generation_logs
7. 后台轮询任务状态（最多 25 次 × 10 秒间隔）
8. 成功 → 更新 shots（video_url, status=completed）
9. 失败 → 自动重试（最多 3 次，指数退避 1s/2s/4s）
10. 重试耗尽 → 更新 shots（status=failed, error_message），自动退还 Credits
```

---

## 十二、页面设计

### 12.1 Landing Page (`/`)

**布局**（单页滚动，5 屏）：

```
┌─────────────────────────────────┐
│  NAV: Logo | Templates | Pricing | Login  │
├─────────────────────────────────┤
│  HERO:                          │
│  "Lock Your Characters.         │
│   Go Global."                   │
│  AI-powered short drama         │
│  production for global markets  │
│  [Start Free →]  [View Templates]│
├─────────────────────────────────┤
│  TEMPLATES:                     │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│  │Revenge│ │Romance│ │Thriller│ │Fantasy│ │
│  │ 复仇  │ │ 甜宠  │ │ 悬疑  │ │ 奇幻  │ │
│  └──────┘ └──────┘ └──────┘ └──────┘ │
├─────────────────────────────────┤
│  HOW IT WORKS:                  │
│  ① Choose Template →            │
│  ② Define Characters →          │
│  ③ Generate with r2v Locking →  │
│  ④ Export for TikTok/YouTube    │
│  [Atlas AI assists every step]  │
├─────────────────────────────────┤
│  WHY REELRAY:                   │
│  • r2v Character Locking        │
│  • 7-Language Lip Sync          │
│  • Direct Platform Export       │
│  • Built-in AI Assistant        │
├─────────────────────────────────┤
│  PRICING:                       │
│  Free Tier → Starter ¥149 → Pro ¥499 → Studio ¥1,499 │
│  Credits system. Pay only for what you generate.      │
│  [See Full Pricing →]                                 │
├─────────────────────────────────┤
│  FOOTER: © 2026 Agito Tech      │
└─────────────────────────────────┘
```

### 12.2 Dashboard (`/dashboard`)

```
┌──────────────────────────────────┐
│  SIDEBAR     │  MAIN CONTENT     │
│  Projects    │  ┌──────────────┐ │
│  • My Drama  │  │ Quick Stats  │ │
│  • New       │  │ 3 projects   │ │
│              │  │ 12 episodes  │ │
│  Credits:    │  │ 8,500 Cr     │ │
│  [Buy More]  │  └──────────────┘ │
│              │  ┌──────────────┐ │
│  [Pricing]   │  │ Recent       │ │
│  [Logout]    │  │ Projects     │ │
│              │  └──────────────┘ │
└──────────────────────────────────┘
```

### 12.3 项目详情 (`/dashboard/projects/[id]`)

```
┌──────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                 │
│  My Drama ◉ draft  ·  Template: Revenge              │
│  ┌──────────────────────────────────────────────────┐│
│  │ CHARACTERS                          [💡 Tips]    ││
│  │ ┌──────┐ ┌──────┐ ┌──────┐                     ││
│  │ │Lena  │ │ Alex │ │ Mr.Li│  [+ Add Character]  ││
│  │ │CEO   │ │Rival │ │Villain│                     ││
│  │ │[Ref] │ │[Ref] │ │[Ref] │                     ││
│  │ └──────┘ └──────┘ └──────┘                     ││
│  └──────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────┐│
│  │ EPISODES                                         ││
│  │ Ep 1  ◉ completed  →  Ep 2  ◉ generating  →     ││
│  │ Ep 3  ◉ draft      →          [+ New Episode]   ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### 12.4 集详情 + 智能助手 (`/dashboard/projects/[id]/episodes/[ep]`)

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Project                              [💡]    │
│  Episode 1 · 5 shots · 120s                              │
│  ┌────────────────────────────────┐  ┌─────────────────┐│
│  │ SHOT LIST                      │  │  Atlas 建议     ││
│  │ #1 Entry    ✅ 170s  10,000Cr  │  │                 ││
│  │ #2 Closeup  ✅ 155s  10,000Cr  │  │ ⚠️ Shot #3     ││
│  │ #3 Window   🔄 running         │  │ 霓虹光场景      ││
│  │ #4 Sip      ⏳ pending         │  │ 建议用 r2v     ││
│  │ #5 Exit     ⏳ pending         │  │ 锚定角色，     ││
│  │              [+ Add Shot]      │  │ 避免漂移       ││
│  └────────────────────────────────┘  │                 ││
│  Credits: 8,500 remaining            │ 预估耗时: 3min  ││
│  [Generate All Pending] [Export →]   │ 预估消耗: 30K Cr││
│                                      └─────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## 十三、MVP 功能边界

### Phase 1 包含
- [x] 项目脚手架 + 暗色赛博 HUD 风格
- [x] 7 张 DB 表 + Supabase 迁移
- [x] GitHub OAuth 登录
- [x] Dashboard 中间件保护
- [x] 项目 CRUD
- [x] 4 套出海短剧预设模板
- [x] 角色管理（CRUD + 参考图上传到 R2）
- [x] 集管理（CRUD）
- [x] 镜头管理（CRUD + 单个生成 + 批量生成）
- [x] 视频生成 API 封装（t2v + r2v + 轮询 + 自动重试 3 次）
- [x] 多模型适配器架构（Phase 1 仅 HappyHorseAdapter）
- [x] 嵌入式智能策划助手（剧本分析 + 角色建议 + 分镜建议 + 预检 + 评分）
- [x] 生成状态实时更新（Supabase Realtime 订阅）
- [x] Credit 积分制 + Stripe 支付（套餐 + 资源包 + 超额扣费）
- [x] 额度消费流水（credit_transactions 表）
- [x] 视频预览（Dashboard 内嵌播放器）
- [x] 9:16 / 16:9 格式切换

### Phase 1 不包含
- [ ] 剧本编辑器 / 剧本导入
- [ ] 文字生图模块（Midjourney/SD API）
- [ ] 多语种配音管线（HappyHorse 原生支持，但先不做 UI 管线）
- [ ] 视频合成（多镜头拼接）
- [ ] 剪辑工作台
- [ ] TikTok/YouTube 一键发布
- [ ] 团队协作
- [ ] 管理后台
- [ ] 计费 Dashboard
- [ ] 电子邮件通知

---

## 十四、配置清单

### 14.1 环境变量（CF Pages）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# HappyHorse (百炼平台)
HAPPYHORSE_API_KEY=
HAPPYHORSE_BASE_URL=https://dashscope.aliyuncs.com
HAPPYHORSE_T2V_ENDPOINT=/api/v1/services/aigc/video-generation/video-synthesis

# DeepSeek (智能助手)
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID=

# App
NEXT_PUBLIC_SITE_URL=https://reelray.agitoai.com
NEXT_PUBLIC_APP_NAME=ReelRay
```

### 14.2 wrangler.toml
```toml
name = "agito-reelray"
compatibility_date = "2026-06-27"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

---

## 十五、交付验收

### 端到端流程验收
1. 访问 `reelray.agitoai.com` → 看到 Landing Page（含 4 套模板展示）
2. 点击 Login → GitHub OAuth 登录成功
3. 进入 Dashboard → 空状态提示「Create your first project」
4. 选择模板「Revenge」→ 创建项目 → 自动预填角色蓝图
5. 添加角色 → 上传参考图到 R2
6. 创建集 → 添加镜头 → 智能助手侧边栏显示建议
7. 点击 Generate → 弹窗确认 Credits 消耗
8. 镜头状态从 pending → submitted → running → completed
9. 视频可预览播放 → 智能助手给出评分
10. 点击 Pricing → 查看套餐方案 → Stripe Checkout 购买 Credits
11. 额度不足时生成被拦截，提示购买

### 代码质量
- ESLint 0 error 0 warning
- TypeScript strict mode
- 所有 Supabase 查询有 loading + error 状态
- API 路由有 try-catch + 错误日志
- Credits 消费有原子性（扣减 + 记录在同一事务中）

---

## 十六、工作量估算

| 模块 | 文件数 | 预估行数 | 说明 |
|------|--------|---------|------|
| 项目脚手架 | 8 | ~300 | next.config / tailwind / layout / metadata |
| 认证 | 3 | ~150 | middleware + callback + login page |
| 数据库 | 3 | ~300 | migration SQL × 7 表 + supabase types |
| 模板系统 | 4 | ~400 | 4 套模板 JSON + 模板选择器 + 预填逻辑 |
| 项目/角色/集/镜头 CRUD | 10 | ~700 | server actions + pages + 状态管理 |
| 视频生成 API | 4 | ~400 | /api/generate + 轮询 + 重试 + HappyHorseAdapter |
| 智能助手 API | 5 | ~400 | 5 个 /api/assistant/* 端点 + DeepSeek 调用 |
| Stripe 支付 + Credits | 5 | ~400 | checkout + webhook + credits 管理 + 消费流水 |
| Landing Page | 3 | ~300 | hero + features + templates + pricing |
| Dashboard | 5 | ~500 | layout + sidebar + stats + projects + 智能助手 UI |
| **合计** | **50** | **~3,850** | |

---

## 十七、Phase 2 展望（明确不做但设计预留）

- 文字生图模块（Midjourney/Stable Diffusion API 集成）
- 多语种配音管线（HappyHorse 原生音频 + 字幕同步）
- 视频合成（多镜头拼接 + 转场）
- 剪辑工作台（基础裁剪 + 拼接）
- TikTok/YouTube 一键发布 API
- 多模型适配器扩展（Seedance / 可灵 / Veo）
- 用量分析与计费 Dashboard
- 团队协作 + 角色库共享
- 自定义模板保存
- Webhook 通知（生成完成 → 邮件/Slack）

---

> **SPEC v3 编写完成。基于以下决策依据：**
> 1. 推演报告：做窄不做全，出海短剧是唯一差异化切口
> 2. 白皮书：96.6% API 成功率 + r2v 锚定确认有效
> 3. 定价推演：Credit 积分制 + 套餐折扣 + 资源包预付费，平台毛利有保障，客户接受度高
> 4. 模板策略：4 套出海短剧预设模板，降低客户从 0 到 1 的入门成本
> 5. 流水线架构：模块化设计，每环节独立 API，Phase 2 可扩展
> 6. 智能助手：嵌入每个环节的侧边栏 AI 建议，LLM 成本可忽略，降低客户错误决策概率
> 7. 多模型预留：Adapter 接口从第一天定义，Phase 1 仅 HappyHorse，Phase 2 无缝扩展
> 8. 极智平台复用：技术栈/认证/支付/部署全线复用，降低开发成本

---

## 十八、v2 → v3 变更摘要

| 维度 | SPEC v2 | SPEC v3 |
|------|---------|---------|
| 定价 | 按集 ¥499/集 | Credit 积分制（¥1=100Cr）+ 3 档套餐 + 3 档资源包 + 超额自动扣费 |
| 模板 | 未提及 | 4 套出海短剧预设模板（复仇/甜宠/悬疑/奇幻） |
| 流水线 | 单条生成链路 | 模块化流水线架构，每环节独立 API，Phase 2 可扩展 |
| 智能助手 | 未提及 | 嵌入式侧边栏 AI 建议，5 个 /api/assistant/* 端点 |
| 多模型 | 仅 HappyHorse | IVideoModelAdapter 接口 + HappyHorseAdapter 实现，Phase 2 预留 |
| DB 表 | 6 张 | 7 张（新增 credit_transactions） |
| 路由 | 9 个 | 12 个（新增 /api/pipeline/* /api/assistant/* /api/stripe/credits） |
| 环境变量 | 10 个 | 14 个（新增 DeepSeek + Stripe 多套餐 price ID） |
| 工作量 | 33 文件 / ~2,350 行 | 50 文件 / ~3,850 行 |