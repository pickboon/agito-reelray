# 任务：Phase 2b 核心引擎增强

## 子任务
- [x] 2b.1: 批量 r2v 锚点图生成引擎 → 完成标准: lint + tsc 通过，commit
- [ ] 2b.2: 一致性自动对比 → 完成标准: lint + tsc 通过，commit（等 2b.1 完成）
- [ ] 2b.3: 多角色场景支持 → 完成标准: lint + tsc 通过，commit（等 2b.2 完成）

## 验证方式
- `npx next lint --no-cache`：新 ERROR 清零
- `node node_modules/typescript/bin/tsc --noEmit`：新 error 清零
- `git add -A && git commit`
