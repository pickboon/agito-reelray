# ReelRay — AI 短剧角色一致性引擎

面向出海短剧创作者的 AI 角色一致性平台。一次上传角色形象，每集自动保持一致。支持 TikTok / YouTube 导出。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | Next.js 15.5 (App Router) + React 19 + TypeScript |
| UI | Tailwind CSS 4 + Radix UI + Lucide Icons |
| 状态管理 | Zustand 5 + zundo (undo/redo) |
| 拖拽 | @dnd-kit (素材面板 → 时间轴) |
| 数据库 + 认证 | Supabase (PostgreSQL + Auth + RLS) |
| 对象存储 | Cloudflare R2 (兼容 S3 API) |
| 支付 | Stripe (订阅制 + 积分包) |
| 视频生成 | 阿里云 DashScope (HappyHorse T2V) |
| 图片生成 | OpenAI GPT-Image |
| 内容审核 | 百度文本审核 API |

## 项目结构

```
app/
  page.tsx                          # 首页
  login/page.tsx                    # 登录
  pricing/page.tsx                  # 定价页
  terms/page.tsx                    # 服务条款
  privacy/page.tsx                  # 隐私政策
  dashboard/
    page.tsx                        # Dashboard 概览
    generate/page.tsx               # AI 视频生成
    assets/page.tsx                 # 素材库
    projects/page.tsx               # 项目列表
    projects/[id]/page.tsx          # 项目详情（含集 & Shot）
    templates/page.tsx              # 模板库 + 模板市场
    community/page.tsx              # 社区（UGC 视频分享）
    settings/page.tsx               # 账户设置（数据导出/删除）
    editor/[episodeId]/page.tsx     # 全屏视频编辑器
    editor/layout.tsx               # 编辑器全屏布局
    _sidebar.tsx                    # 侧边栏导航
    _dashboard-content.tsx          # 编辑器路由条件渲染
  api/
    generate/route.ts               # 视频生成入口（原子积分扣费）
    batch/route.ts                  # 批量生成（原子预扣）
    generation/{create,list,status} # 生成任务 CRUD
    editor/{save,load,export}       # 编辑器 API
    stripe/{checkout,webhook}       # 支付
    engine/{generate-anchor,check-consistency}
    assistant/{analyze-script,suggest-*}
    upload/route.ts                 # 文件上传 (R2 + 尺寸验证)
    download/route.ts               # 签名下载（@deprecated）
    generation/download/route.ts    # 签名下载（主入口）
    community/{publish,like,report,list} # 社区 API
    templates/{save,publish,use,report,market,user} # 模板 API
    user/{data-export,account-delete}    # 账户管理 API

components/
  editor/                           # 编辑器组件
    EditorShell.tsx                 # 三栏布局壳
    Toolbar.tsx                     # 顶部工具栏
    PreviewPlayer.tsx               # 视频预览（DOM + Canvas）
    CanvasOverlay.tsx               # 转场遮罩渲染
    SubtitleLayer.tsx               # 字幕 DOM 层
    KeyframeEditor.tsx              # 关键帧曲线编辑器
    Timeline/
      TimelineRuler.tsx             # 时间刻度尺
      TimelineTrack.tsx             # 轨道容器
      TimelineClip.tsx              # 可拖拽片段
      Playhead.tsx                  # 播放头
    Panels/
      AssetPanel.tsx                # 素材库面板
      AudioPanel.tsx                # BGM 管理
      PropertiesPanel.tsx           # 属性面板

lib/
  editor/                           # 编辑器核心逻辑
    store.ts                        # Zustand store + temporal
    types.ts                        # 类型定义
    playback-engine.ts              # 视频同步引擎
    audio-engine.ts                 # Web Audio API 混音
    time.ts                         # 像素/秒换算 + 吸附
    clipboard.ts                    # 片段复制/粘贴
    effects/
      keyframes.ts                  # 关键帧插值
      transitions.ts                # 转场实现
  engine/
    anchor.ts                       # 角色锚点图
    consistency.ts                  # 一致性检测
    multi-character.ts              # 多角色调度
  adapters/                         # AI 服务适配层
    happyhorse.ts                   # 阿里云 DashScope
  supabase/
    client.ts                       # 浏览器端客户端
    server.ts                       # 服务端客户端
  moderation.ts                     # 内容审核（本地 + 百度 API）
  logger.ts                         # 安全日志封装
  redirect.ts                       # Open Redirect 防护
  stripe.ts / r2.ts / csrf.ts / rate-limit.ts

supabase/migrations/
  001_initial_schema.sql            # 核心 7 表
  002_anchor.sql                    # 角色锚点图
  003_checkout_hardening.sql        # Webhook 幂等
  004_generation_tasks.sql          # 生成任务表
  005_editor.sql                    # 编辑器时间轴 + 导出任务
  006_community_posts.sql           # 社区帖子 + 点赞
  007_user_templates.sql            # 用户模板 + 模板市场
  008_profiles.sql                  # 用户档案
  009_shots_status_fix.sql          # Shot 状态修复
  010_rate_limits.sql               # DB-backed 限流表 + RPC
  011_content_reports.sql           # 内容举报表
  012_credits_safety.sql            # Credits 原子操作 + CHECK 约束
  013_rls_hardening.sql             # RLS 补全

middleware.ts                       # Supabase Auth + CSRF + 安全响应头
```

## 快速开始

### 环境要求

- Node.js 22+
- Supabase 项目（已启用 Auth + Database）
- Stripe 账号（订阅 + 积分包产品）
- 阿里云 DashScope API Key
- OpenAI API Key
- Cloudflare R2 存储桶
- 百度文本审核 API Key（可选，用于 UGC 内容审核）

### 1. 克隆 & 安装

```bash
git clone <repo-url>
cd agito-reelray
npm install
```

### 2. 环境变量

创建 `.env.local`：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_PASSWORD=your-db-password

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_SMALL_BUNDLE_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_MEDIUM_BUNDLE_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_LARGE_BUNDLE_PRICE_ID=price_xxx

# AI 服务
HAPPYHORSE_BASE_URL=https://dashscope.aliyuncs.com
HAPPYHORSE_T2V_ENDPOINT=/api/v1/services/aigc/video-generation/video-synthesis
HAPPYHORSE_API_KEY=your-dashscope-key
OPENAI_API_KEY=sk-xxx

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-r2-public-url

# 百度内容审核（可选）
BAIDU_API_KEY=your-baidu-api-key
BAIDU_SECRET_KEY=your-baidu-secret-key
ENABLE_NSFW_CHECK=false

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ReelRay
NEXT_PUBLIC_ICP_NUMBER=ICP备XXXXXXXX号
```

### 3. 数据库迁移

在 Supabase Dashboard → SQL Editor 中按顺序执行 `supabase/migrations/` 目录下的所有 SQL 文件（001 ~ 013）。

### 4. 启动开发服务器

```bash
npm run dev
# → http://localhost:3000
```

## 核心功能

### Phase 1 — 基础平台

- 邮箱/GitHub/Google/Apple OAuth 登录 + Supabase Auth
- 项目管理（CRUD）
- 集 (Episode) 管理
- Shot 拆解（AI 辅助分析剧本）
- 视频生成（阿里云 DashScope HappyHorse）
- Stripe 订阅制 + 积分包购买
- 文件上传 (R2) + 签名下载

### Phase 2 — 角色一致性引擎

- 角色锚点图生成（GPT-Image 提取面部特征）
- 一致性检测（余弦相似度比对）
- 多角色同框调度
- 角色参考图上传与管理

### Phase 3 — ReelRay 编辑器

- **全屏编辑器** `/dashboard/editor/[episodeId]`
- **时间轴**：手写拖拽移动/边缘截取，播放头拖拽，缩放 20-200px/s
- **预览**：DOM `<video>` 池 + Canvas 转场遮罩 + DOM 字幕层
- **撤销/重做**：Zustand + zundo temporal middleware（50 步历史）
- **片段操作**：移动、截取、删除、复制粘贴、分割
- **转场**：fade / dissolve / wipe-left / wipe-right
- **关键帧动画**：缩放 + 平移，支持 linear / ease-in / ease-out / ease-in-out
- **音频**：BGM 上传、音量、淡入淡出、循环
- **字幕**：添加/编辑/删除，位置/字号/颜色可调
- **素材面板**：自动加载该 Episode 的已完成 Shots
- **持久化**：时间轴状态保存到 `editor_timelines` 表
- **导出**：FFmpeg 子进程合成，积分扣除，异步执行（Serverless 环境优雅降级）

### Phase 4 — 社区 & 模板市场

- **社区**：用户发布生成的视频作品，点赞、浏览
- **模板库**：保存生成参数为模板，一键复用
- **模板市场**：公开模板供其他用户使用，按使用次数排序
- **举报机制**：用户可举报违规内容，管理员后台审核

### Phase 5 — 安全审计加固（2026-06-29 完成）

**安全基础设施**
- 安全响应头：CSP / X-Frame-Options / Referrer-Policy / Permissions-Policy
- CSRF 防护：Double-Submit Cookie 严格验证（无空窗）
- Rate Limit：DB-backed RPC 持久化，支持多实例部署
- Open Redirect 防护：仅允许相对路径重定向
- 安全日志：防止敏感信息泄露（error.message only）
- 登录暴力破解防护：5 次失败后锁定 60 秒

**内容审核与防护**
- 本地词库：25+ 条规则（犯罪/色情/暴恐/未成年/歧视/广告/Prompt注入）
- 百度文本审核 API：远程 AI 审核兜底
- UGC 内容审核：社区发布/模板保存/模板发布均接入审核
- 上传图片尺寸验证：64~8192px，比例 < 50:1
- NSFW 检测预留接口（环境变量控制）
- 内容举报机制：`content_reports` 表 + API

**合规与法律**
- 用户协议：中英双语（UGC规则/DMCA/三次封号/济南仲裁）
- 隐私政策：OAuth数据/Stripe/R2/百度API/30天保留期
- ICP 备案号：Footer 显示（环境变量控制）
- 用户设置页：数据导出（JSON）+ 账户删除（级联）

**逻辑与数据一致性**
- Credits 原子操作：`deduct_credits`/`refund_credits` RPC + CHECK 约束
- 批量生成原子预扣：`batch` 路由 + `batch_id` 参数
- 点赞原子更新：`increment_likes` RPC
- 模板使用计数：`increment_use_count` RPC
- Auth Callback 修复：`.eq("user_id", user.id)` 过滤
- 后台轮询迁移：移除 250s Promise，改为前端驱动 GET 轮询
- `needs_review` 状态：一致性分数 < 0.6 时标记，UI 黄色警告 Badge
- 批量操作上限：100 条/次

**功能完善**
- 社区列表游标分页：`cursor`/`next_cursor`/`has_more`
- 模板市场搜索筛选：关键词/模型/模式
- 编辑器导出优雅降级：FFmpeg 不可用时返回 503
- 下载 API 统一：`/api/download` 标记 `@deprecated`
- RLS 补全：`generation_tasks` + `content_reports` 管理员策略

**防AI策略**
- robots.txt：屏蔽 12 个主流 AI 爬虫（GPTBot/anthropic-ai/Claude-Web/CCBot/Google-Extended/PerplexityBot/cohere-ai/Meta-ExternalAgent/Applebot-Extended/Bytespider/FacebookBot/Omgilibot/Amazonbot/YouBot）
- Meta robots：移除无效 `noai`/`noimageai` 标签
- 下载 URL 保护：有效期 15 分钟 + `no-store` + 日志
- 公开列表限流 + Cache-Control
- AI 生成内容标识：`is_ai_generated: true`
- JSON-LD `aggregateRating`：4.8/5 (100 reviews)
- 定价页 Credits 计算器：交互式预估

### 键盘快捷键

| 快捷键 | 动作 |
|--------|------|
| `Space` | 播放/暂停 |
| `Delete` / `Backspace` | 删除选中片段 |
| `Ctrl+Z` / `Ctrl+Shift+Z` | 撤销/重做 |
| `Ctrl+C` / `Ctrl+V` | 复制/粘贴 |
| `Ctrl+A` | 全选 |
| `Ctrl+S` | 保存时间轴 |
| `S` | 在播放头位置分割 |

## 数据库表结构

| 表名 | 用途 |
|------|------|
| `projects` | 项目（含剧本、类型） |
| `characters` | 角色（含锚点图、描述） |
| `episodes` | 集 |
| `shots` | 镜头（含 prompt、视频 URL、状态、一致性分数） |
| `generation_tasks` | AI 生成任务队列 |
| `generation_logs` | 生成日志 |
| `subscriptions` | 用户订阅 + 积分余额 |
| `credit_transactions` | 积分流水 |
| `webhook_events` | Stripe Webhook 幂等去重 |
| `editor_timelines` | 编辑器时间轴 JSONB 状态 |
| `export_jobs` | 视频导出任务 |
| `community_posts` | 社区帖子（UGC 视频分享） |
| `community_likes` | 社区点赞 |
| `user_templates` | 用户模板（私有 + 公开市场） |
| `profiles` | 用户档案 |
| `rate_limits` | DB-backed 限流记录 |
| `content_reports` | 内容举报（管理员审核） |

所有表启用 RLS，用户只能操作自己的数据。

## 积分体系

| 操作 | 消耗 |
|------|------|
| 视频生成 (1 个 Shot) | 10,000 |
| 导出视频 ≤ 1 分钟 720p | 5,000 |
| 导出视频 ≤ 1 分钟 1080p | 10,000 |
| 导出视频 ≤ 3 分钟 | 2 倍 |
| 导出视频 > 3 分钟 | 按分钟线性 |

## 部署

项目基于 Next.js App Router，支持：

- **Vercel**：直接连接 GitHub 仓库自动部署
- **Cloudflare Pages**：需要 Functions 兼容层
- **自托管 VPS / Docker**：`npm run build && npm start`

部署时注意：
- 导出功能需要服务器安装 FFmpeg（Serverless 环境自动降级）
- 环境变量全部配置到部署平台
- Stripe Webhook URL 更新为生产域名
- 百度内容审核 API 配置（可选，不配则仅本地词库防线）
- ICP 备案号配置到 `NEXT_PUBLIC_ICP_NUMBER`

## 开发命令

```bash
npm run dev          # 开发服务器 (Turbopack HMR)
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run lint         # ESLint
npm run type-check   # TypeScript 类型检查
```

## 安全审计记录

2026-06-29 完成全站六维审计，修复 51 项问题（排除 3 项误报/不适用）：

- **S-07 (Stripe Webhook 签名)**：误报，已使用 `constructEvent` 验证
- **A-02 (robots.txt)**：部分误报，已存在基础规则，补充 AI 爬虫
- **F-09 (注册流程)**：用户决定暂不实现，保留仅 OAuth 登录

详细修复清单见 [Phase 5 — 安全审计加固](#phase-5--安全审计加固2026-06-29-完成)。

## License

Proprietary - Agito Technology (Jinan) Co., Ltd.
