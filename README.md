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

## 项目结构

```
app/
  page.tsx                          # 首页
  login/page.tsx                    # 登录
  pricing/page.tsx                  # 定价页
  dashboard/
    page.tsx                        # Dashboard 概览
    generate/page.tsx               # AI 视频生成
    assets/page.tsx                 # 素材库
    projects/page.tsx               # 项目列表
    projects/[id]/page.tsx          # 项目详情（含集 & Shot）
    templates/page.tsx              # 剧本模板
    editor/[episodeId]/page.tsx     # 全屏视频编辑器 ★
    editor/layout.tsx               # 编辑器全屏布局
    _sidebar.tsx                    # 侧边栏导航
    _dashboard-content.tsx          # 编辑器路由条件渲染
  api/
    generate/route.ts               # 视频生成入口
    generation/{create,list,status} # 生成任务 CRUD
    editor/{save,load,export}       # 编辑器 API
    stripe/{checkout,webhook}       # 支付
    engine/{generate-anchor,check-consistency}
    assistant/{analyze-script,suggest-*}
    upload/route.ts                 # 文件上传 (R2)
    download/route.ts               # 签名下载

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
  stripe.ts / r2.ts / csrf.ts / rate-limit.ts

supabase/migrations/
  001_initial_schema.sql            # 核心 7 表
  002_anchor.sql                    # 角色锚点图
  003_checkout_hardening.sql        # Webhook 幂等
  004_generation_tasks.sql          # 生成任务表
  005_editor.sql                    # 编辑器时间轴 + 导出任务

middleware.ts                       # Supabase Auth + CSRF
```

## 快速开始

### 环境要求

- Node.js 22+
- Supabase 项目（已启用 Auth + Database）
- Stripe 账号（订阅 + 积分包产品）
- 阿里云 DashScope API Key
- OpenAI API Key
- Cloudflare R2 存储桶

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

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=ReelRay
```

### 3. 数据库迁移

在 Supabase Dashboard → SQL Editor 中按顺序执行：

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_anchor.sql`
3. `supabase/migrations/003_checkout_hardening.sql`
4. `supabase/migrations/004_generation_tasks.sql`
5. `supabase/migrations/005_editor.sql`

### 4. 启动开发服务器

```bash
npm run dev
# → http://localhost:3000
```

## 核心功能

### Phase 1 — 基础平台

- 邮箱/GitHub 登录 + Supabase Auth
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
- **导出**：FFmpeg 子进程合成，积分扣除，异步执行

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
| `shots` | 镜头（含 prompt、视频 URL、状态） |
| `generation_tasks` | AI 生成任务队列 |
| `generation_logs` | 生成日志 |
| `subscriptions` | 用户订阅 + 积分余额 |
| `credit_transactions` | 积分流水 |
| `webhook_events` | Stripe Webhook 幂等去重 |
| `editor_timelines` | 编辑器时间轴 JSONB 状态 |
| `export_jobs` | 视频导出任务 |

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
- **自托管 VPS**：`npm run build && npm start`

部署时注意：
- 导出功能需要服务器安装 FFmpeg
- 环境变量全部配置到部署平台
- Stripe Webhook URL 更新为生产域名

## 开发命令

```bash
npm run dev          # 开发服务器 (Turbopack HMR)
npm run build        # 生产构建
npm run start        # 启动生产服务
npm run lint         # ESLint
npm run type-check   # TypeScript 类型检查
```
