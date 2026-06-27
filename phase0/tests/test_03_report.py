#!/usr/bin/env python3
"""
Phase 0 — Test 03: 报告生成
目标：从 raw_*.csv 和 summary_*.json 生成可读报告

运行: python3 phase0/tests/test_03_report.py

输出: phase0/results/report_<timestamp>.md
"""

import os
import json
import csv
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / "phase0" / ".env")

RESULTS_DIR = PROJECT_ROOT / "phase0" / "results"

DIM_NAMES = {
    "t1_face": "面部一致性",
    "t2_multi_shot": "多镜头连贯",
    "t3_lighting": "光影统一",
    "t4_costume": "衣着头饰",
    "t5_background": "背景空间",
}

DECISION_THRESHOLDS = {
    "go": 40,
    "extend": 30,
}


def find_latest(pattern: str) -> Path | None:
    """找最新匹配文件"""
    files = sorted(RESULTS_DIR.glob(pattern), reverse=True)
    return files[0] if files else None


def load_csv(csv_path: Path) -> list[dict]:
    """加载 CSV"""
    rows = []
    with open(csv_path, "r", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows


def generate_report() -> str:
    """生成报告"""
    csv_file = find_latest("raw_*.csv")
    if not csv_file:
        return "❌ 无测试数据。请先运行 test_02_consistency.py"

    rows = load_csv(csv_file)

    # 按维度统计
    dim_stats = {}
    for r in rows:
        dk = r["dim"]
        if dk not in dim_stats:
            dim_stats[dk] = {"ok": 0, "fail": 0, "total": 0}
        dim_stats[dk]["total"] += 1
        if r["status"] == "SUCCEEDED":
            dim_stats[dk]["ok"] += 1
        else:
            dim_stats[dk]["fail"] += 1

    total_ok = sum(s["ok"] for s in dim_stats.values())
    total_all = sum(s["total"] for s in dim_stats.values())
    overall = total_ok / total_all * 100 if total_all > 0 else 0

    # 失败模式分类
    fail_modes = {}
    for r in rows:
        if r["status"] != "SUCCEEDED":
            err = r.get("error", "Unknown")[:80]
            fail_modes[err] = fail_modes.get(err, 0) + 1

    # 判断决策
    if overall >= DECISION_THRESHOLDS["go"]:
        decision = "✅ GO — ≥40% 成功率，进入 Phase 1"
    elif overall >= DECISION_THRESHOLDS["extend"]:
        decision = "⚠️ EXTEND — 30-39% 成功率，延期一周攻坚"
    else:
        decision = "❌ HALT — <30% 成功率，暂停重审"

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")

    report = f"""# Phase 0 角色锁定验证报告

**生成时间**: {datetime.now().isoformat()}
**数据文件**: {csv_file.name}

---

## 1. 概览

| 指标 | 值 |
|------|-----|
| 总样本数 | {total_all} |
| 成功数 | {total_ok} |
| 总体成功率 | {overall:.1f}% |
| 决策 | {decision} |

---

## 2. 维度明细

| 维度 | 成功 | 失败 | 成功率 |
|------|------|------|--------|
"""
    for dk in sorted(dim_stats.keys()):
        s = dim_stats[dk]
        pct = s["ok"] / s["total"] * 100 if s["total"] > 0 else 0
        name = DIM_NAMES.get(dk, dk)
        report += f"| {name} ({dk}) | {s['ok']} | {s['fail']} | {pct:.1f}% |\n"

    report += f"""
---

## 3. 失败模式分析

| 错误类型 | 次数 |
|----------|------|
"""
    for err, count in sorted(fail_modes.items(), key=lambda x: -x[1]):
        short = err[:60] + ("..." if len(err) > 60 else "")
        report += f"| {short} | {count} |\n"

    report += f"""
---

## 4. 决策判断

- **Go 阈值**: ≥{DECISION_THRESHOLDS['go']}%
- **Extend 阈值**: {DECISION_THRESHOLDS['extend']}-{DECISION_THRESHOLDS['go']-1}%
- **当前值**: {overall:.1f}% → **{decision}**

---

## 5. 下一步

"""
    if overall >= DECISION_THRESHOLDS["go"]:
        report += """1. 确认 ≥ 2 家种子客户有意愿（客户验证报告）
2. 建立 Phase 1 项目骨架（Next.js + Supabase + Stripe）
3. 设计 MVP 核心页面：角色管理 → Prompt 编排 → 批量生成 → 交付
"""
    elif overall >= DECISION_THRESHOLDS["extend"]:
        report += """1. 分析失败模式，找出最薄弱维度
2. 对薄弱维度优化 Prompt（参考 phase0/prompts/ 目录）
3. 考虑切换 Seedance 2.5 对比测试（预计 7 月初上线）
4. 一周后重跑测试
"""
    else:
        report += """1. 分析根因：是模型能力不足还是 Prompt 工程不够
2. 考虑切换模型（Seedance 2.5 对比测试）
3. 如多模型测试均 <30%：暂停主产品线，保留政企/课程两条线
"""

    # 保存
    report_path = RESULTS_DIR / f"report_{ts}.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report)

    return f"📄 Report generated: {report_path}\n{report[:2000]}"


if __name__ == "__main__":
    output = generate_report()
    print(output)
