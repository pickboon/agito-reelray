# 极光 ReelRay Phase 1 — SPEC v2

> **基于**: 平台形态推演报告 + 技术可行性白皮书 + Phase 0 测试结论
> **日期**: 2026-06-27 | **目标**: 出海短剧角色锁定生成工具 MVP

---

## 一、产品定位（来自推演报告）

### 做
- ✅ 角色锁定生成引擎（r2v 锚定 + Prompt 工程，核心卖点）
- ✅ 多语种版本自动生成（HappyHorse 1.1 原生 7 语言唇同步）
- ✅ 海外平台直出格式（TikTok 9:16 竖屏 / YouTube 16:9 横屏，一键适配）
- ✅ 按集计费 + 用量透明（¥499/集起，避开订阅制陷阱）

### 不做
- ❌ 全链路工具（剧本编辑器、分镜管理、协作审改 — 打不过 Catimind/万兴）
- ❌ 自建分发平台（不自建 APP，不跟 ReelShort/TikTok 抢渠道）
- ❌ 社区/剧本交易/认证体系（精力分散，无差异化）
- ❌ 订阅制付费（客户决策门槛高，按集计费更轻量）

### 差异化一句话
**「把角色锁定 + 多语种生成 + 海外平台格式，三个点做透，其他的都不做。」**

---

## 二、技术栈

| 层 | 选型 | 复用来源 |
|----|------|---------|
| 框架 | Next.js 15.5 (App Router) | 极智平台 |
| UI | React 19 + TailwindCSS 4 + Shadcn/ui | 极智平台 |
| 认证 | Supabase Auth (GitHub OAuth) | 极智平台 |
| 数据库 | Supabase (PostgreSQL) | 极智平台 |
| 存储 | Cloudflare R2 (视频 + 参考图) | 新建 |
| 支付 | Stripe Checkout + Webhook | 极智平台 |
| 部署 | Cloudflare Pages | 极智平台 |
| AI 模型 | HappyHorse 1.1 (t2v + r2v) | Phase 0 已验证 |

---

## 三、视觉设计

### 3.1 设计语言
- **暗色模式**：深蓝黑底 `#0a0a1a`，赛博 HUD 风格
- **主色**：明亮科幻金 `#FACC15`（品牌主色）
- **辅色**：赛博青 `#00F0FF`（交互/高亮）
- **动画**：微光扫描线、霓虹光晕、终端光标闪烁
- **字体**：系统等宽字体（JetBrains Mono / Fira Code）

### 3.2 与极智平台的一致性
- 暗色主题 + 赛博 HUD 风格与极智保持一致
- 但 ReelRay 更偏「出海/国际化」—— 默认英文 UI，支持中文切换
- 品牌色：极智用青色为主，极光用金色为主，形成视觉区分

---

## 四、页面路由

```
/                       Landing Page（产品介绍 + 定价 + CTA）
/login                  登录（GitHub OAuth）
/dashboard              项目仪表盘（登录后首页）
/dashboard/projects     项目列表
/dashboard/projects/[id] 项目详情（角色管理 + 集列表）
/dashboard/projects/[id]/episodes/[ep] 集详情（镜头列表 + 生成状态）
/dashboard/projects/[id]/episodes/[ep]/shots/[shot] 镜头详情（预览 + 参数）
/pricing                定价页
/api/generate           生成 API（POST 提交 + GET 轮询）
/api/stripe/webhook     Stripe Webhook
```

**仅 9 个路由**，不做 `/admin`、`/articles`、`/community`、`/settings` 等附加模块。

---

## 五、数据模型（6 张表）

### 5.1 `projects`
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  target_languages TEXT[] DEFAULT '{en}',
  aspect_ratio TEXT DEFAULT '9:16',     -- 9:16 TikTok / 16:9 YouTube
  status TEXT DEFAULT 'draft',          -- draft / generating / completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.2 `characters`
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

### 5.3 `episodes`
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

### 5.4 `shots`
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
  error_message TEXT,
  elapsed_seconds INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.5 `generation_logs`
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
  cost_estimate REAL,                   -- 预估成本（元）
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5.6 `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'pay_per_episode',  -- pay_per_episode / monthly
  credits_remaining INTEGER DEFAULT 0,  -- 剩余集数配额
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 六、API 设计

### 6.1 `POST /api/generate`
提交视频生成任务。

```typescript
// Request
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
{
  task_id: string;
  shot_id: string;
  status: "submitted";
}
```

### 6.2 `GET /api/generate?taskId=xxx`
轮询任务状态。

```typescript
// Response 200
{
  task_id: string;
  status: "running" | "completed" | "failed";
  video_url?: string;
  error_message?: string;
  elapsed_seconds: number;
}
```

### 6.3 生成逻辑（后端）
```
1. 校验 shot 状态 + 用户额度
2. 构造 HappyHorse API 请求（含 model/mode/prompt/media/size/duration/seed）
3. 提交异步任务 → 获取 task_id
4. 更新 shots 表（status=submitted, task_id）
5. 写入 generation_logs
6. 后台轮询任务状态（最多 25 次 × 10 秒间隔）
7. 成功 → 更新 shots（video_url, status=completed）
8. 失败 → 自动重试（最多 3 次，指数退避 1s/2s/4s）
9. 重试耗尽 → 更新 shots（status=failed, error_message）
```

---

## 七、页面设计

### 7.1 Landing Page (`/`)

**布局**（单页滚动，5 屏）：

```
┌─────────────────────────────────┐
│  NAV: Logo | Pricing | Login    │  ← 固定顶部
├─────────────────────────────────┤
│  HERO:                          │
│  "Lock Your Characters.         │
│   Go Global."                   │  ← 主标题 + 副标题 + CTA
│  [Start Creating →]             │
├─────────────────────────────────┤
│  HOW IT WORKS:                  │
│  ① Define Character →           │
│  ② Generate Shots →             │  ← 3 步流程图
│  ③ Export for TikTok/YouTube    │
├─────────────────────────────────┤
│  WHY REELRAY:                   │
│  • r2v Character Locking        │
│  • 7-Language Lip Sync          │  ← 3 列卖点卡片
│  • Direct Platform Export       │
├─────────────────────────────────┤
│  PRICING:                       │
│  ¥499/episode                   │  ← 简洁定价卡片
│  Pay only for what you generate │
├─────────────────────────────────┤
│  FOOTER: © 2026 Agito Tech      │  ← 简洁 Footer
└─────────────────────────────────┘
```

### 7.2 Dashboard (`/dashboard`)

**布局**：

```
┌──────────────────────────────────┐
│  SIDEBAR     │  MAIN CONTENT     │
│  Projects    │  ┌──────────────┐ │
│  • My Drama  │  │ Quick Stats  │ │
│  • New       │  │ 3 projects   │ │
│              │  │ 12 episodes  │ │
│  [Pricing]   │  │ ¥0 spent     │ │
│              │  └──────────────┘ │
│  [Logout]    │  ┌──────────────┐ │
│              │  │ Recent       │ │
│              │  │ Projects     │ │
│              │  └──────────────┘ │
└──────────────────────────────────┘
```

### 7.3 项目详情 (`/dashboard/projects/[id]`)

```
┌──────────────────────────────────┐
│  ← Back to Dashboard             │
│  My Drama ◉ draft                │
│  ┌──────────────────────────────┐│
│  │ CHARACTERS                   ││
│  │ ┌─────┐ ┌─────┐             ││
│  │ │Lena │ │ Alex│  [+ Add]    ││
│  │ │Ref  │ │Ref  │             ││
│  │ └─────┘ └─────┘             ││
│  └──────────────────────────────┘│
│  ┌──────────────────────────────┐│
│  │ EPISODES                     ││
│  │ Ep 1  ◉ completed  →        ││
│  │ Ep 2  ◉ generating →        ││
│  │ Ep 3  ◉ draft      →        ││
│  │              [+ New Episode] ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

### 7.4 集详情 (`/dashboard/projects/[id]/episodes/[ep]`)

```
┌──────────────────────────────────┐
│  ← Back to Project               │
│  Episode 1 · 5 shots · 120s      │
│  ┌──────────────────────────────┐│
│  │ SHOT LIST                    ││
│  │ #1 Entry    ✅ 170s          ││
│  │ #2 Closeup  ✅ 155s          ││
│  │ #3 Window   🔄 running       ││
│  │ #4 Sip      ⏳ pending       ││
│  │ #5 Exit     ⏳ pending       ││
│  │              [+ Add Shot]    ││
│  └──────────────────────────────┘│
│  [Generate All Pending]          │
│  [Export Episode →]              │
└──────────────────────────────────┘
```

---

## 八、MVP 功能边界

### Phase 1 包含
- [x] 项目脚手架 + 暗色赛博 HUD 风格
- [x] 6 张 DB 表 + Supabase 迁移
- [x] GitHub OAuth 登录
- [x] Dashboard 中间件保护
- [x] 项目 CRUD
- [x] 角色管理（CRUD + 参考图上传到 R2）
- [x] 集管理（CRUD）
- [x] 镜头管理（CRUD + 单个生成 + 批量生成）
- [x] 视频生成 API 封装（t2v + r2v + 轮询 + 自动重试 3 次）
- [x] 生成状态实时更新（Supabase Realtime 订阅）
- [x] Stripe 支付（按集购买额度）
- [x] 视频预览（Dashboard 内嵌播放器）
- [x] 9:16 / 16:9 格式切换

### Phase 1 不包含
- [ ] 剧本编辑器 / 剧本导入
- [ ] 多角色同时生成
- [ ] 多语种自动配音（HappyHorse 原生支持，但先不做 UI 管线）
- [ ] TikTok/YouTube 一键发布
- [ ] 团队协作
- [ ] 管理后台
- [ ] 计费 Dashboard
- [ ] 电子邮件通知

---

## 九、配置清单

### 9.1 环境变量（CF Pages）

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# HappyHorse
HAPPYHORSE_API_KEY=
HAPPYHORSE_BASE_URL=https://dashscope.aliyuncs.com
HAPPYHORSE_T2V_ENDPOINT=/api/v1/services/aigc/video-generation/video-synthesis

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_ID=

# App
NEXT_PUBLIC_SITE_URL=https://reelray.agitoai.com
NEXT_PUBLIC_APP_NAME=ReelRay
```

### 9.2 wrangler.toml
```toml
name = "agito-reelray"
compatibility_date = "2026-06-27"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

---

## 十、交付验收

### 端到端流程验收
1. 访问 `reelray.agitoai.com` → 看到 Landing Page
2. 点击 Login → GitHub OAuth 登录成功
3. 进入 Dashboard → 空状态提示「Create your first project」
4. 创建项目 → 添加角色 → 上传参考图
5. 创建集 → 添加镜头 → 点击 Generate
6. 镜头状态从 pending → submitted → running → completed
7. 视频可预览播放
8. 点击 Pricing → Stripe Checkout → 购买额度成功
9. 额度不足时生成被拦截

### 代码质量
- ESLint 0 error 0 warning
- TypeScript strict mode
- 所有 Supabase 查询有 loading + error 状态
- API 路由有 try-catch + 错误日志

---

## 十一、工作量估算

| 模块 | 文件数 | 预估行数 | 说明 |
|------|--------|---------|------|
| 项目脚手架 | 8 | ~300 | next.config / tailwind / layout / metadata |
| 认证 | 3 | ~150 | middleware + callback + login page |
| 数据库 | 2 | ~200 | migration SQL + supabase types |
| 项目/角色/集/镜头 CRUD | 8 | ~600 | server actions + pages |
| 视频生成 API | 3 | ~300 | /api/generate + 轮询 + 重试 |
| Stripe 支付 | 3 | ~200 | checkout + webhook + pricing |
| Landing Page | 2 | ~200 | hero + features + pricing |
| Dashboard | 4 | ~400 | layout + sidebar + stats + projects |
| **合计** | **33** | **~2,350** | |

---

## 十二、Phase 2 展望（明确不做但设计预留）

- 多语种配音管线（HappyHorse 原生音频 + 字幕同步）
- TikTok/YouTube 一键发布 API
- 多模型适配器（Seedance / 可灵 fallback）
- 用量分析与计费 Dashboard
- 团队协作 + 角色库共享
- Webhook 通知（生成完成 → 邮件/Slack）

---

> **SPEC v2 编写完成。基于以下决策依据：**
> 1. 推演报告：做窄不做全，出海短剧是唯一差异化切口
> 2. 白皮书：96.6% API 成功率 + r2v 锚定确认有效
> 3. 极智平台复用：技术栈/认证/支付/部署全线复用，降低开发成本
