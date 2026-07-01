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
| AI 助手 | DeepSeek Chat (OpenAI-compatible API) |
| TTS 配音 | DashScope CosyVoice V2 |
| 内容审核 | 百度文本审核 API |

## 项目结构

```
app/
  page.tsx                          # 首页（赛博朋克 Hero + 功能介绍）
  login/page.tsx                    # 登录（OAuth + 注册 + 忘记密码）
  pricing/page.tsx                  # 定价页（3 档订阅 + 3 档积分包）
  terms/page.tsx                    # 服务条款（中英双语）
  privacy/page.tsx                  # 隐私政策
  contact/page.tsx                  # 联系我们
  community/page.tsx                # 社区（UGC 视频分享 + 热力榜单）
  templates/page.tsx                # 模板市场（官方 + 用户 + 社区模板）
  auth/callback/route.ts            # OAuth 回调处理

  dashboard/
    page.tsx                        # Dashboard 概览（推荐模板 + CTA）
    hub/page.tsx                    # 中枢（AI 助手：剧本分析 + 镜头建议 + 角色建议）
    forge/page.tsx                  # 锻造（灵感沙盒 + 角色锚定 + 视觉风格 + TTS）
    queue/page.tsx                  # 队列（渲染队列：Shot + 沙盒任务，重试/取消）
    generate/page.tsx               # AI 视频生成（模型选择 + 参数 + 批量）
    assets/page.tsx                 # 资产库（视频/图片，用于项目）
    projects/page.tsx               # 项目列表（创建/编辑/删除）
    projects/[id]/page.tsx          # 项目详情（集列表 + Shot 管理）
    projects/[id]/episodes/[ep]/page.tsx  # 集详情（Shot 列表 + 批量操作）
    projects/[id]/episodes/[ep]/shots/[shot]/page.tsx  # Shot 详情（→ ShotDrawer）
    settings/page.tsx               # 账户设置（数据导出/删除/登出）
    editor/[episodeId]/page.tsx     # 全屏视频编辑器
    editor/layout.tsx               # 编辑器全屏布局
    _sidebar.tsx                    # 侧边栏导航
    _dashboard-content.tsx          # 编辑器路由条件渲染

  api/
    generate/route.ts               # 视频生成入口（原子积分扣费）
    batch/route.ts                  # 批量生成（原子预扣）
    generation/
      create/route.ts               # 沙盒生成创建
      list/route.ts                 # 生成任务列表
      status/route.ts               # 轮询状态
      delete/route.ts               # 删除任务
      download/route.ts             # 签名下载
    shots/
      route.ts                      # Shot CRUD
      [id]/route.ts                 # Shot GET/PATCH/DELETE
      batch/route.ts                # 批量 Shot 操作
    editor/
      save/route.ts                 # 保存时间轴
      load/route.ts                 # 加载时间轴
      export/route.ts               # FFmpeg 导出视频
    stripe/
      checkout/route.ts             # Stripe 结算
      webhook/route.ts              # Webhook 幂等处理
      credits/route.ts              # 积分查询
    engine/
      generate-anchor/route.ts      # 角色锚点图生成
      check-consistency/route.ts    # 一致性检测
    assistant/
      analyze-script/route.ts       # 剧本分析
      suggest-shots/route.ts        # 镜头建议
      suggest-character/route.ts    # 角色建议
      precheck/route.ts             # 预检查
      score/route.ts                # 评分
    audio/
      tts/route.ts                  # DashScope CosyVoice TTS 配音
    templates/
      apply/route.ts                # 模板应用（创建项目+集+分镜）
      save/route.ts                 # 保存模板
      publish/route.ts              # 发布到市场
      use/route.ts                  # 使用模板
      user/route.ts                 # 用户模板列表
      market/route.ts               # 市场模板列表
      report/route.ts               # 模板举报
    community/
      publish/route.ts              # 发布作品
      like/route.ts                 # 点赞/取消点赞
      list/route.ts                 # 作品列表（游标分页）
      leaderboard/route.ts          # 热力榜单
      report/route.ts               # 作品举报
    upload/route.ts                 # 文件上传 (R2 + 尺寸验证)
    download/route.ts               # 签名下载（@deprecated）
    user/
      data-export/route.ts          # 数据导出（JSON）
      account-delete/route.ts       # 账户删除（级联）
      settings/route.ts             # 用户设置（视觉风格）

components/
  editor/                           # 编辑器组件
    EditorShell.tsx                 # 三栏布局壳
    Toolbar.tsx                     # 顶部工具栏（保存/导出/撤销/重做/缩放）
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
      AudioPanel.tsx                # BGM 管理（上传/淡入淡出/循环）
      PropertiesPanel.tsx           # 属性面板（转场/关键帧/字幕）
  community/
    VideoDetailSheet.tsx            # 视频详情侧边栏（以此创建项目）
    TemplatePreviewDialog.tsx       # 模板预览弹窗
  layout/
    GlobalStatusBar.tsx             # 全局状态栏（积分/订阅）
    PublicLayout.tsx                # 公开页面布局
    PublicNav.tsx                   # 公开导航栏
    PublicFooter.tsx                # 页脚
  CreateProjectDialog.tsx           # 创建项目弹窗（自动创建第一集）
  DemoShowcase.tsx                  # 首页演示展示
  HowItWorksBanner.tsx              # 工作流程引导（4 步可点击跳转）
  MobileNav.tsx                     # 移动端导航
  ShotDrawer.tsx                    # Shot 详情抽屉（生成/一致性检查）

lib/
  editor/                           # 编辑器核心逻辑
    store.ts                        # Zustand store + temporal middleware
    types.ts                        # 类型定义
    playback-engine.ts              # 视频同步引擎
    audio-engine.ts                 # Web Audio API 混音
    time.ts                         # 像素/秒换算 + 吸附
    clipboard.ts                    # 片段复制/粘贴
    effects/
      keyframes.ts                  # 关键帧插值
      transitions.ts                # 转场实现（fade/dissolve/wipe）
  engine/
    anchor.ts                       # 角色锚点图（GPT-Image）
    consistency.ts                  # 一致性检测（余弦相似度）
    multi-character.ts              # 多角色同框调度
  adapters/                         # AI 服务适配层
    happyhorse.ts                   # 阿里云 DashScope
    types.ts                        # 适配器接口
    index.ts                        # 适配器注册
  templates/                        # 官方模板定义（JSON）
    index.ts                        # 模板加载器
    revenge.json                    # 复仇重生
    romance.json                    # 甜宠虐恋
    thriller.json                   # 悬疑惊悚
    fantasy.json                    # 穿越仙侠
    crossworld.json                 # 穿越时空
    ceo.json                        # 霸总契约
    warlord.json                    # 战神归来
    comeback.json                   # 逆袭女王
  supabase/
    client.ts                       # 浏览器端客户端
    server.ts                       # 服务端客户端
  assistant.ts                      # DeepSeek AI 助手封装
  api-fetch.ts                      # 客户端 API 请求（自动 CSRF）
  models.ts                         # 视频模型/分辨率/时长/比例定义
  moderation.ts                     # 内容审核（本地词库 + 百度 API）
  logger.ts                         # 安全日志封装
  redirect.ts                       # Open Redirect 防护
  csrf.ts                           # CSRF Double-Submit Cookie
  rate-limit.ts                     # DB-backed 限流
  stripe.ts                         # Stripe 客户端
  r2.ts                             # Cloudflare R2 操作
  utils.ts                          # 工具函数（cn, formatDate 等）

supabase/migrations/
  001_initial_schema.sql            # 核心 7 表
  002_anchor.sql                    # 角色锚点图
  003_checkout_hardening.sql        # Webhook 幂等
  004_generation_tasks.sql          # 生成任务表
  005_editor.sql                    # 编辑器时间轴 + 导出任务
  006_add_role_column.sql           # 用户角色（user/admin）
  007_community_posts.sql           # 社区帖子 + 点赞
  008_user_templates.sql            # 用户模板 + 模板市场
  009_profiles.sql                  # 用户档案
  010_shots_status_fix.sql          # Shot 状态修复
  011_rate_limits.sql               # DB-backed 限流表 + RPC
  012_content_reports.sql           # 内容举报表
  013_credits_safety.sql            # Credits 原子操作 + CHECK 约束
  014_rls_hardening.sql             # RLS 补全
  015_user_settings.sql             # 用户设置表

middleware.ts                       # Supabase Auth + CSRF + 安全响应头
next.config.ts                      # Next.js 配置（Turbopack + 图片域名）
```

## 快速开始

### 环境要求

- Node.js 22+
- Supabase 项目（已启用 Auth + Database）
- Stripe 账号（订阅 + 积分包产品）
- 阿里云 DashScope API Key（HappyHorse T2V + CosyVoice TTS）
- OpenAI API Key（GPT-Image 角色锚点图）
- DeepSeek API Key（AI 助手）
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

# DeepSeek AI 助手
DEEPSEEK_API_KEY=your-deepseek-key
DEEPSEEK_BASE_URL=https://api.deepseek.com

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

在 Supabase Dashboard → SQL Editor 中按顺序执行 `supabase/migrations/` 目录下的所有 SQL 文件（001 ~ 015）。

### 4. 启动开发服务器

```bash
npm run dev
# → http://localhost:3000
```

## 核心功能

### Dashboard 导航

| 页面 | 路由 | 功能 |
|------|------|------|
| Dashboard | `/dashboard` | 概览、推荐模板、快速开始 CTA |
| 中枢 | `/dashboard/hub` | AI 助手（剧本分析 + 镜头建议 + 角色建议 + 评分） |
| 锻造 | `/dashboard/forge` | 灵感沙盒生成 + 角色锚定 + 视觉风格滤镜 + TTS 配音 |
| 队列 | `/dashboard/queue` | 渲染队列（Shot + 沙盒任务，重试/取消） |
| 生成 | `/dashboard/generate` | AI 视频生成（模型选择 + 参数 + 批量 + 发布社区） |
| 资产 | `/dashboard/assets` | 视频/图片素材库（用于项目） |
| 项目 | `/dashboard/projects` | 项目列表（创建/编辑/删除） |
| 社区 | `/community` | UGC 视频分享 + 热力榜单 + 点赞 |
| 模板市场 | `/templates` | 官方 + 用户 + 社区模板（搜索/筛选/使用/发布） |
| 设置 | `/dashboard/settings` | 数据导出 + 账户删除 + 登出 |
| 编辑器 | `/dashboard/editor/[episodeId]` | 全屏视频编辑器 |

### Phase 1 — 基础平台

- 邮箱/GitHub/Google/Apple OAuth 登录 + Supabase Auth
- 注册功能（邮箱 + 密码）
- 忘记密码功能
- 项目管理（CRUD）
- 集 (Episode) 管理
- Shot 拆解（AI 辅助分析剧本）
- 视频生成（阿里云 DashScope HappyHorse）
- Stripe 订阅制 + 积分包购买
- 文件上传 (R2) + 签名下载
- 创建项目时自动创建第一集

### Phase 2 — 角色一致性引擎

- 角色锚点图生成（GPT-Image 提取面部特征）
- 一致性检测（余弦相似度比对，< 0.6 标记 needs_review）
- 多角色同框调度
- 角色参考图上传与管理
- ShotDrawer 抽屉式 Shot 详情（生成/一致性检查/角色锁定）

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

- **社区**：用户发布生成的视频作品，点赞、浏览、热力榜单
- **模板库**：保存生成参数为模板，一键复用
- **模板市场**：公开模板供其他用户使用，按使用次数排序
- **模板应用**：使用官方/用户模板一键创建项目 + 集 + 分镜
- **以此创建项目**：社区视频详情页可跳转生成页并预填参数
- **举报机制**：用户可举报违规内容，管理员后台审核

### Phase 5 — 灵感沙盒 & AI 助手

- **灵感沙盒**：快速生成测试视频（不消耗项目 Shot），结果可导入项目
- **AI 中枢助手**：剧本分析 + 镜头建议 + 角色建议 + 质量评分（DeepSeek）
- **视觉风格滤镜**：赛博/废土/写实等预设 + 自定义参数，保存到 user_settings
- **TTS 配音**：DashScope CosyVoice V2（5 种音色 + 情绪控制 + 自定义文本）
- **渲染队列**：Shot 任务 + 沙盒任务统一展示，支持重试/取消

### Phase 6 — 安全审计加固（2026-06-29 完成）

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
- robots.txt：屏蔽 12 个主流 AI 爬虫
- Meta robots：移除无效 `noai`/`noimageai` 标签
- 下载 URL 保护：有效期 15 分钟 + `no-store` + 日志
- 公开列表限流 + Cache-Control
- AI 生成内容标识：`is_ai_generated: true`
- JSON-LD `aggregateRating`：4.8/5 (100 reviews)
- 定价页 Credits 计算器：交互式预估

### Phase 7 — 功能连通性审计修复（2026-07-01 完成）

**第一轮审计（9 项修复）**
- Settings 页面添加数据导出按钮（GDPR 合规）
- 侧边栏添加社区和模板市场导航入口
- 编辑器导出按钮确认存在（Toolbar.tsx）
- Dashboard 模板预览入口优化（浏览全部链接）
- 队列页面实现沙盒任务重试（保留原始 prompt）
- Assets 用于项目对话框确认按钮 + loading 状态
- Forge TTS 添加自定义文本输入（300 字限制）
- Community/Templates 页面 layout 确认存在
- CreateProjectDialog + Projects 页面自动创建第一集

**第二轮审计（5 项修复）**
- 修复侧边栏社区/模板路由 404（`/dashboard/community` → `/community`）
- 补充 4 个缺失模板 preset（crossworld/ceo/warlord/comeback）
- Generate 页面读取 URL 参数预填表单（社区视频以此创建项目）
- AudioPanel 改用 apiFetch 确保 CSRF token 注入
- Pricing 页面改用 apiFetch 统一 CSRF 处理

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
| `projects` | 项目（含剧本、类型、模板） |
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
| `user_settings` | 用户设置（视觉风格偏好） |

所有表启用 RLS，用户只能操作自己的数据。

## 积分体系

| 操作 | 消耗 |
|------|------|
| 视频生成 (1 个 Shot) | 10,000 |
| 导出视频 ≤ 1 分钟 720p | 5,000 |
| 导出视频 ≤ 1 分钟 1080p | 10,000 |
| 导出视频 ≤ 3 分钟 | 2 倍 |
| 导出视频 > 3 分钟 | 按分钟线性 |

## 官方模板

8 套内置模板，每套包含完整剧本结构（角色设定 + 场景 + 分镜）：

| 模板 ID | 名称 | 类型 |
|---------|------|------|
| `revenge` | 复仇重生 | 复仇逆袭 |
| `romance` | 甜宠虐恋 | 甜宠恋爱 |
| `thriller` | 悬疑惊悚 | 悬疑惊悚 |
| `fantasy` | 穿越仙侠 | 古风仙侠 |
| `crossworld` | 穿越时空 | 穿越时空 |
| `ceo` | 霸总契约 | 霸总契约 |
| `warlord` | 战神归来 | 战神归来 |
| `comeback` | 逆袭女王 | 逆袭女王 |

模板定义文件位于 `lib/templates/*.json`，通过 `/api/templates/apply` 应用。

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

## 已知限制

- 编辑器 FFmpeg 导出在 Serverless 环境（如 Vercel）会降级为 503
- TypeScript 类型检查存在 Ark UI Select 组件的预置类型警告（不影响功能）

- 视频模型仅 HappyHorse 1.1 可用，Kling 3.0 和 Wan 2.5 为占位（未接入）
- TTS 配音为实时合成，不持久化音频文件

## License

Proprietary - Agito Technology (Jinan) Co., Ltd.
