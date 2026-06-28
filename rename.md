# 极光 ReelRay — 项目交接文档

## 基本信息
- **项目名称**: 极光 ReelRay（AI 短剧出海角色锁定平台）
- **产品域名**: reelray.agitoai.com
- **GitHub 仓库**: `pickboon/agito-reelray`（`main` 分支）
- **本地唯一真源**: `~/Projects/agito-reelray`
- **技术栈**: 待定（预计与极智平台一致：Next.js + Supabase + Stripe + Cloudflare R2）
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
- 定价模型：按集计费，¥499/集起

## 开发流程
1. `git pull origin main` 拉取最新代码到 `~/Projects/agito-reelray`
2. 使用 `codex` CLI（本地已安装 v0.122.0）在源码目录下达开发指令
3. 开发完成后 `git add` / `git commit`（每个修改必须 commit + 回传 hash）
4. 部署: `git push main` → CF Pages 自动部署

## 最新 commit
`69063f8` — P0+P1 六维审计修复 18 问题清零, lint 0✗0, tsc 0✗0

## Phase 0 验证链（已完成 ✅）
- HappyHorse API 角色锁定成功率测试 ✅
- 全维度摸底 32 条 (31/32, 96.9%) ✅
- 1.0 vs 1.1 对比 7/7 对 ✅
- 多镜头叙事连贯性 A/B 组 10/10 ✅
- 人工视觉审查：r2v 参考图锚定方案确认有效 ✅
- 水印风险已消除（商用版无水印）✅
- 种子客户触达 ⏳
- 决策节点：全部判据通过 → Phase 1

## Phase 1 进度（进行中）
- 平台脚手架完成：10 个页面 + 8 个 API 路由 + 零 lint 零 type 错误 (commit `6e5ff09`)
- 六维审计修复：18 问题清零 (commit `69063f8`)

## 设定文件
完整设定 8 文件位于 workspace: `~/.qclaw/workspace-agent-96d43c9f/`
- AGENTS.md / SOUL.md / IDENTITY.md / USER.md / HEARTBEAT.md / TOOLS.md / DECISION_SYSTEM.md / KNOWLEDGE.md

## 更新日志
- 2026-06-28: Phase 0 完成，Phase 1 脚手架 + 六维审计修复完成
- 2026-06-27: 项目初始化，Phase 0 启动
