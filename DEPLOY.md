# ReelRay — Cloudflare Pages 部署指南

## 项目概览

- **框架**: Next.js 15.5 (App Router)
- **运行时**: Node.js 22.x
- **构建命令**: `npm run build`
- **输出目录**: `.next` (标准 Next.js build output)
- **中间件**: Supabase SSR 认证 (`middleware.ts`)
- **API Routes**: 14 个路由 (assistant/\*, stripe/\*, engine/\*, generate, upload, download)

---

## 部署方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **@opennextjs/cloudflare** (推荐) | 生产环境 | 官方支持、Next.js 15 完整兼容、ISR/Streaming | 需要额外安装依赖 |
| **CF Pages Next.js Integration** | 快速验证 | 零配置、Dashboard 集成 | 功能受限、不支持所有 Next.js 特性 |
| **纯静态导出** (`output: 'export'`) | 纯前端 | 最简单、无 Server 依赖 | 不支持 API Routes / Middleware / SSR |

> **当前项目有 API Routes 和 Middleware，不能使用纯静态导出。**

---

## 推荐方案: @opennextjs/cloudflare

### 1. 安装依赖

```bash
npm install -D @opennextjs/cloudflare wrangler
```

### 2. 更新 wrangler.toml

当前 `wrangler.toml` 配置:

```toml
name = "agito-reelray"
compatibility_date = "2026-06-28"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

使用 `@opennextjs/cloudflare` 时需要调整为:

```toml
name = "agito-reelray"
main = ".open-next/worker.js"
compatibility_date = "2026-06-28"
compatibility_flags = ["nodejs_compat"]

[assets]
directory = ".open-next/assets"
binding = "ASSETS"
```

### 3. 更新 package.json scripts

```json
{
  "scripts": {
    "build": "next build",
    "build:cf": "opennextjs-cloudflare build",
    "preview": "opennextjs-cloudflare preview",
    "deploy": "opennextjs-cloudflare deploy"
  }
}
```

### 4. 部署步骤

```bash
# 登录 Cloudflare
npx wrangler login

# 构建
npm run build:cf

# 本地预览
npm run preview

# 部署到生产
npm run deploy
```

---

## 备选方案: CF Pages Dashboard 集成

如果不想引入额外构建工具，可以直接在 Cloudflare Dashboard 中配置:

1. **Dashboard** → **Pages** → **Create a project** → **Connect to Git**
2. 选择 GitHub 仓库 `agito-reelray`
3. 构建设置:
   - **Production branch**: `main`
   - **Build command**: `npx @cloudflare/next-on-pages@latest`
   - **Build output directory**: `.vercel/output/static`
4. 保存并部署

> 此方案依赖 `@cloudflare/next-on-pages`，该包已进入维护模式，长期建议使用 `@opennextjs/cloudflare`。

---

## 环境变量完整清单

在 CF Pages Dashboard → **Settings** → **Variables and Secrets** 中配置以下变量:

### Supabase (认证 & 数据库)

| 变量名 | 类型 | 来源 | 说明 |
|--------|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plaintext | Supabase Dashboard → Project Settings → API | 项目 URL，客户端可访问 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Plaintext | Supabase Dashboard → Project Settings → API | 匿名公钥，用于客户端认证 |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Supabase Dashboard → Project Settings → API | 服务端密钥，**仅在 API Routes 中使用** |

### Stripe (支付)

| 变量名 | 类型 | 来源 | 说明 |
|--------|------|------|------|
| `STRIPE_SECRET_KEY` | Secret | Stripe Dashboard → Developers → API keys | 服务端密钥 (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Secret | Stripe Dashboard → Developers → Webhooks | Webhook 签名密钥 (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID` | Plaintext | Stripe Dashboard → Products → Price IDs | Starter 套餐价格 ID (`price_...`) |
| `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Plaintext | Stripe Dashboard → Products → Price IDs | Pro 套餐价格 ID (`price_...`) |
| `NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID` | Plaintext | Stripe Dashboard → Products → Price IDs | Studio 套餐价格 ID (`price_...`) |

### Cloudflare R2 (对象存储)

| 变量名 | 类型 | 来源 | 说明 |
|--------|------|------|------|
| `R2_ACCOUNT_ID` | Plaintext | CF Dashboard → Account Home → 右侧栏 | Cloudflare 账户 ID |
| `R2_ACCESS_KEY_ID` | Secret | CF Dashboard → R2 → Manage R2 API Tokens | S3 兼容访问密钥 |
| `R2_SECRET_ACCESS_KEY` | Secret | CF Dashboard → R2 → Manage R2 API Tokens | S3 兼容密钥 |
| `R2_BUCKET_NAME` | Plaintext | CF Dashboard → R2 → Buckets | 存储桶名称 |
| `R2_PUBLIC_URL` | Plaintext | R2 Bucket → Settings → Public Access | 公开访问域名 (如 `https://cdn.reelray.agitoai.com`) |

### AI 服务

| 变量名 | 类型 | 来源 | 说明 |
|--------|------|------|------|
| `HAPPYHORSE_API_KEY` | Secret | 阿里云百炼平台 → API Key 管理 | 视频生成 API 密钥 |
| `HAPPYHORSE_BASE_URL` | Plaintext | 默认 `https://dashscope.aliyuncs.com` | 百炼 API 基址 |
| `HAPPYHORSE_T2V_ENDPOINT` | Plaintext | 默认 `/api/v1/services/aigc/video-generation/video-synthesis` | 文生视频端点 |
| `DEEPSEEK_API_KEY` | Secret | DeepSeek 开放平台 → API Keys | 智能助手 API 密钥 |
| `DEEPSEEK_BASE_URL` | Plaintext | 默认 `https://api.deepseek.com/v1` | DeepSeek API 基址 |

### 应用配置

| 变量名 | 类型 | 来源 | 说明 |
|--------|------|------|------|
| `NEXT_PUBLIC_SITE_URL` | Plaintext | 部署后确定 | 站点公开 URL (如 `https://reelray.agitoai.com`) |
| `NEXT_PUBLIC_APP_URL` | Plaintext | 部署后确定 | 应用 URL，用于跳转和 meta |
| `NEXT_PUBLIC_APP_NAME` | Plaintext | 自定义 | 应用名称 (默认 `ReelRay`) |

---

## Node.js 版本要求

- **最低**: Node.js 20.x
- **推荐**: Node.js 22.x (当前开发环境: v22.22.3)
- CF Pages 构建环境默认 Node.js 20，可在 Dashboard 设置中指定版本

在 CF Pages Settings 中设置:
```
NODE_VERSION = 22
```

---

## 部署前检查清单

- [ ] 所有环境变量已在 CF Pages Dashboard 中配置
- [ ] Supabase 项目已创建，auth providers 已配置
- [ ] Stripe Webhook 端点指向 `https://<domain>/api/stripe/webhook`
- [ ] R2 Bucket 已创建，公开访问已开启
- [ ] R2 API Token 已生成且有读写权限
- [ ] 自定义域名已绑定 (如需要)
- [ ] `npm run build` 本地构建通过

---

## 构建验证

```bash
# 类型检查
npm run type-check

# Lint
npm run lint

# 完整构建
npm run build
```

所有步骤必须零 error 通过后才可部署。

---

## Webhook 配置

部署完成后，需要在 Stripe Dashboard 中注册 Webhook:

- **URL**: `https://reelray.agitoai.com/api/stripe/webhook`
- **Events**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 故障排查

### 构建失败: Missing env
确认所有非 `NEXT_PUBLIC_` 前缀的变量已设为 Secret 类型。CF Pages 的 Secret 变量不会在构建时注入到客户端包中。

### Middleware 不生效
确认 `middleware.ts` 位于项目根目录 (与 `app/` 同级)，CF Pages 的 `nodejs_compat` flag 已启用。

### R2 上传 403
检查 R2 API Token 权限是否包含 `Object Read & Write`，以及 Bucket CORS 规则是否允许你的域名。
