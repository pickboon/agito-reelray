# 角色锁定 Prompt 工程方案

## 核心原理

AI 短剧的最大痛点不是"单段画面差"，而是**跨镜头角色不一致**。
通用视频模型默认无状态——每次调用生成独立角色外貌。
我们的解决方案是**通过 Prompt 工程建立"角色锚点"**，让模型在多次调用中维持视觉一致性。

## 锁定层级（按优先级）

```
Layer 1 — 生物锚点
  ├── 种族 + 年龄 + 性别
  ├── 面部特征（脸型/眼型/鼻型/唇型/肤色）
  └── 体态特征（身高/体型/比例）

Layer 2 — 装扮锚点
  ├── 发型/发色/发质
  ├── 服装款式/颜色/材质
  └── 配饰/标志物

Layer 3 — 场景锚点
  ├── 环境光照逻辑
  ├── 空间参照物
  └── 色调/氛围

Layer 4 — 动态锚点
  ├── 表情变化中保持不变的面部基线
  └── 肢体动作中的体型一致性
```

## Prompt 模板

### 模板 1：角色定义（一次性录入）

```
Character design sheet for [角色名]:
- Ethnicity: [东/西/南亚/非/拉美]
- Age: [具体年龄]
- Face: [脸型] face, [眼型] eyes, [鼻型] nose, [唇型] lips
- Skin: [肤色描述，含冷暖调]
- Hair: [长度] [颜色] [质感] [发型]
- Build: [身高] [体型]
- Distinguishing marks: [有/无，具体描述]
- Default outfit: [完整服装描述]
- Default expression: [默认表情]
```

### 模板 2：分镜调用（每段视频）

```
[角色定义全文——从模板1粘贴]

[CAMERA]: [景别: close-up/medium/wide/establishing/over-shoulder/pov]
[ANGLE]: [角度: front/three-quarter/profile/low-angle/high-angle]
[ACTION]: [角色正在做什么]
[LIGHTING]: [光照条件]
[SCENE]: [场景描述]
[MOOD]: [情绪氛围]

Technical: cinematic quality, 4K, shallow depth of field, consistent character identity.
```

### 模板 3：连续性增强（可选追加）

```
Previous frame reference: [上一帧简短描述]
Maintain exact same character appearance as previous frames.
No visual drift in facial features, hair color, or outfit details.
```

## 测试策略

### Round 1：基线（不加额外 anchor）
用最简 prompt："A woman in a red dress in a garden" → 测裸成功率

### Round 2：模板 1+2（加角色锚点）
用完整角色定义 + 分镜模板 → 测锁定后成功率

### Round 3：模板 1+2+3（加连续性引用）
引用前一帧 → 测跨帧连贯成功率

### 对比分析
Round 2 成功率 - Round 1 成功率 = Prompt 工程增益
如果增益 > 15%，说明 Prompt 工程是有效护城河
