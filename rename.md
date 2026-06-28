# 极光 ReelRay — 项目交接文档

## 基本信息
- **项目名称**: 极光 ReelRay（AI 短剧出海角色锁定平台）
- **产品域名**: reelray.agitoai.com
- **GitHub 仓库**: `pickboon/agito-reelray`（`main` 分支）
- **本地唯一真源**: `~/Projects/agito-reelray`
- **技术栈**: Next.js 15.5 + React 19.2 + TypeScript 5 + TailwindCSS 4 + Shadcn/ui + Supabase + Stripe + Cloudflare R2
- **部署方式**: CF Pages（`git push main` 自动部署）

## 品牌关系
- 极智（jizhi.agitoai.com）= AI 实训能力入口
- 极光（reelray.agitoai.com）= AI 短剧商业出口
- 官网（agitoai.com）= 品牌门户
- 三者形成 Agito 科技品牌矩阵

## 业务定位
- AI 短剧出海的"角色锁定"SaaS 工具
- 核心差异化：角色一致性锁定（面部/衣着头饰/场景空间/光影）
- 目标市场：海外短剧制作团队（东南亚/中东/欧美）
- 定价模型：Starter/Pro/Studio 三档 + Credits 充值包

## 开发流程
1. `git pull origin main` 拉取最新代码到 `~/Projects/agito-reelray`
2. 使用 `codex` CLI（本地已安装 v0.122.0）在源码目录下达开发指令
3. 开发完成后 `git add` / `git commit`（每个修改必须 commit + 回传 hash）
4. 部署: `git push main` → CF Pages 自动部署

## 最新 commit
`18fbf0e` — fix(login): 恢复 @supabase/ssr createBrowserClient

## Phase 0 验证链（已完成 ✅）
- HappyHorse API 角色锁定成功率测试 ✅
- 全维度摸底 32 条 (31/32, 96.9%) ✅
- 1.0 vs 1.1 对比 7/7 对 ✅
- 多镜头叙事连贯性 A/B 组 10/10 ✅
- 人工视觉审查：r2v 参考图锚定方案确认有效 ✅
- 水印风险已消除（商用版无水印）✅
- 种子客户触达 ⏳
- 决策节点：全部判据通过 → Phase 1

## Phase 1 进度（已完成 ✅）
- 平台脚手架：10 个页面 + 8 个 API 路由 + 零 lint 零 type 错误 (commit `6e5ff09`)
- 六维审计修复：18 问题清零 (commit `69063f8`)

## Phase 2 进度（已完成 ✅）
- **Phase 2a**: Landing Page 5屏 + 全站中文化 + 端到端审查 (commits `410c4bf`→`5a396c9`)
- **Phase 2b**: 核心引擎增强 — 批量 r2v 锚点图生成 + 一致性对比引擎 + 多角色支持 (commits `272b896`→`989beec`)
- **Phase 2c**: 模板商店 — 8 套付费模板 (revenge/romance/thriller/fantasy + crossworld/ceo/warlord/comeback) + 模板商店 UI (commit `dab5543`)
- **Phase 2d**: Stripe 端到端测试 + 部署配置 + 全站审计修复 18 项 (commits `c95ce47`→`138d7ee`)
- **样片**: 3 个 HappyHorse 1.1 t2v demo (revenge_gala.mp4 / ceo_office.mp4 / thriller_room.mp4)
- **登录系统**: 邮箱密码登录 + GitHub OAuth 降级 + 客户环境变量注入修复 (commits `738d86f`→`18fbf0e`)
- **测试账号**: test@agitoai.com / Test123456!，1,000,000 Credits，Studio 套餐

## Phase 3 待办（接下来）
- **CF Pages 部署上线**: 配置 wrangler.toml + 环境变量 + 部署
- **Product Hunt 准备**: LP 文案 + 截图 + 上线时序
- **种子客户触达**: 联系 Phase 0 识别的短剧工作室
- **Supabase RLS 策略验证**: 确认所有表 RLS 正确生效
- **Stripe 生产模式切换**: 测试 webhook → 生产 webhook
- **ICP 备案号**: 申请后替换 Footer 占位

## 设定文件
完整设定 8 文件位于 workspace: `~/.qclaw/workspace-agent-96d43c9f/`
- AGENTS.md / SOUL.md / IDENTITY.md / USER.md / HEARTBEAT.md / TOOLS.md / DECISION_SYSTEM.md / KNOWLEDGE.md

## 更新日志
- 2026-06-28: Phase 2 全部完成（含登录系统修复 + 3 个样片 + 8 套模板 + 全站审计）
- 2026-06-28: Phase 0 完成，Phase 1 脚手架 + 六维审计修复完成
- 2026-06-27: 项目初始化，Phase 0 启动