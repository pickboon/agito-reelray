#!/usr/bin/env python3
"""
Phase 0 — Batch Runner: 角色锁定一致性测试（限流友好版）
批次策略: 2维度 × 5样本 = 10条视频，分5批，每批2条，间隔45秒

运行: python3 phase0/tests/run_batch.py
"""

import os, sys, time, json, csv, requests
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
load_dotenv(PROJECT_ROOT / "phase0" / ".env")

API_KEY = os.getenv("HAPPYHORSE_API_KEY", "")
BASE_URL = os.getenv("HAPPYHORSE_BASE_URL", "https://dashscope.aliyuncs.com")

T2V_ENDPOINT = "/api/v1/services/aigc/video-generation/video-synthesis"
BATCH_SIZE = 1          # 每批并发数
BATCH_GAP = 45          # 批间隔（秒）
POLL_INTERVAL = 8       # 轮询间隔（秒）
TASK_TIMEOUT = 180      # 单任务超时（秒）

# ── 角色锚点 ──
CHAR = {
    "name": "Lena",
    "traits": (
        "A young East Asian woman, 25 years old, "
        "long straight black hair reaching mid-back, "
        "almond-shaped dark brown eyes, small straight nose, "
        "fair skin with a subtle warm undertone. "
        "Character design sheet reference: consistent facial proportions."
    ),
    "outfit": "A tailored crimson red dress, knee-length, subtle V-neck, no patterns.",
    "scene": "A sunlit urban garden with terracotta tiles, climbing ivy on a stone wall, warm afternoon light.",
}

# ── 测试用例：T1面部(5) + T4衣着(5) ──
CASES = [
    # === T1: 面部一致性 ===
    {
        "id": "t1_01", "dim": "t1_face",
        "prompt": f"Character design sheet of {CHAR['name']}: {CHAR['traits']} Front view, neutral expression, studio lighting."
    },
    {
        "id": "t1_02", "dim": "t1_face",
        "prompt": f"Close-up portrait of {CHAR['name']}: {CHAR['traits']} Three-quarter view, gentle smile, soft window light."
    },
    {
        "id": "t1_03", "dim": "t1_face",
        "prompt": f"Profile shot of {CHAR['name']}: {CHAR['traits']} Looking left, dramatic side lighting."
    },
    {
        "id": "t1_04", "dim": "t1_face",
        "prompt": f"Medium shot of {CHAR['name']}: {CHAR['traits']} Slight head tilt, curious expression, overcast lighting."
    },
    {
        "id": "t1_05", "dim": "t1_face",
        "prompt": f"{CHAR['name']} laughing: {CHAR['traits']} Joyful expression, candid moment, golden hour light."
    },
    # === T4: 衣着头饰 ===
    {
        "id": "t4_01", "dim": "t4_costume",
        "prompt": f"{CHAR['name']}: {CHAR['traits']} Wearing {CHAR['outfit']} Standing in {CHAR['scene']} Full body shot."
    },
    {
        "id": "t4_02", "dim": "t4_costume",
        "prompt": f"{CHAR['name']}: {CHAR['traits']} Wearing {CHAR['outfit']} Sitting on a modern office chair, medium shot."
    },
    {
        "id": "t4_03", "dim": "t4_costume",
        "prompt": f"{CHAR['name']}: {CHAR['traits']} Wearing {CHAR['outfit']} Walking through {CHAR['scene']} Dynamic motion shot."
    },
    {
        "id": "t4_04", "dim": "t4_costume",
        "prompt": f"{CHAR['name']}: {CHAR['traits']} Wearing {CHAR['outfit']} Close-up of dress detail, fabric texture visible."
    },
    {
        "id": "t4_05", "dim": "t4_costume",
        "prompt": f"{CHAR['name']}: {CHAR['traits']} Wearing {CHAR['outfit']} Kneeling to pick up a flower in {CHAR['scene']}"
    },
]


def submit(prompt: str) -> dict:
    """提交异步任务"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "X-DashScope-Async": "enable",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "happyhorse-1.0-t2v",
        "input": {"prompt": prompt},
        "parameters": {"duration": 5},
    }
    try:
        r = requests.post(f"{BASE_URL}{T2V_ENDPOINT}", json=payload, headers=headers, timeout=30)
        if r.status_code == 200:
            d = r.json()
            return {"ok": True, "task_id": d["output"]["task_id"]}
        return {"ok": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def poll(task_id: str, timeout: int = TASK_TIMEOUT) -> dict:
    """轮询单任务"""
    headers = {"Authorization": f"Bearer {API_KEY}"}
    started = time.time()
    while time.time() - started < timeout:
        time.sleep(POLL_INTERVAL)
        try:
            r = requests.get(f"{BASE_URL}/api/v1/tasks/{task_id}", headers=headers, timeout=15)
            if r.status_code != 200:
                continue
            d = r.json()
            s = d["output"]["task_status"]
            if s == "SUCCEEDED":
                return {"ok": True, "status": "SUCCEEDED", "video_url": d["output"].get("video_url", ""),
                        "elapsed": round(time.time() - started), "usage": d.get("usage", {})}
            elif s in ("FAILED", "CANCELED"):
                return {"ok": False, "status": s, "error": d["output"].get("message", ""),
                        "code": d["output"].get("code", "")}
        except Exception as e:
            pass
    return {"ok": False, "status": "TIMEOUT", "error": f"Timeout after {timeout}s"}


def main():
    if not API_KEY or API_KEY == "sk-your-key-here":
        print("❌ 请配置 HAPPYHORSE_API_KEY")
        return

    # 分批次
    batches = []
    for i in range(0, len(CASES), BATCH_SIZE):
        batches.append(CASES[i:i + BATCH_SIZE])

    dim_order = ["t1_face", "t4_costume"]
    dim_names = {"t1_face": "面部一致性", "t4_costume": "衣着头饰"}

    print("=" * 60)
    print(f"Phase 0 — Batch Runner")
    print(f"  Cases: {len(CASES)} | Batches: {len(batches)} | Batch size: {BATCH_SIZE}")
    print(f"  Gap: {BATCH_GAP}s | Poll: {POLL_INTERVAL}s | Timeout: {TASK_TIMEOUT}s")
    print("=" * 60)

    all_results = []

    # 增量保存用
    results_dir = PROJECT_ROOT / "phase0" / "results"
    results_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = results_dir / f"raw_{ts}.csv"
    fields = ["dim", "case_id", "task_id", "status", "video_url", "elapsed", "prompt", "error", "usage"]

    def save_incremental(results):
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader()
            w.writerows(results)

    for bi, batch in enumerate(batches):
        print(f"\n{'─' * 50}")
        print(f"📦 Batch {bi + 1}/{len(batches)} ({len(batch)} tasks)")
        print(f"{'─' * 50}")

        # Step 1: 提交 batch 内所有任务
        tasks = []
        for case in batch:
            print(f"  🔄 [{case['id']}] Submitting...", end=" ", flush=True)
            r = submit(case["prompt"])
            if r["ok"]:
                print(f"task_id={r['task_id']}")
                tasks.append({"case": case, "task_id": r["task_id"]})
            else:
                print(f"❌ {r['error'][:80]}")
                all_results.append({
                    "dim": case["dim"], "case_id": case["id"],
                    "task_id": r["task_id"],
                    "video_url": "", "elapsed": 0, "prompt": case["prompt"][:200],
                    "error": r["error"],
                })
                save_incremental(all_results)

        # Step 2: 轮询全部
        for t in tasks:
            case = t["case"]
            print(f"  ⏳ [{case['id']}] Polling {t['task_id'][:16]}...", end=" ", flush=True)
            r = poll(t["task_id"])
            if r["ok"]:
                e = r.get("elapsed", 0)
                print(f"✅ {e}s")
            else:
                print(f"❌ {r.get('status', 'ERROR')} {r.get('error', '')[:60]}")
            all_results.append({
                "dim": case["dim"], "case_id": case["id"],
                "task_id": t["task_id"],
                "status": r.get("status", "UNKNOWN"),
                "video_url": r.get("video_url", ""),
                "elapsed": r.get("elapsed", 0),
                "prompt": case["prompt"][:200],
                "error": r.get("error", ""),
                "usage": json.dumps(r.get("usage", {})) if r.get("usage") else "",
            })
            save_incremental(all_results)

        # 批间冷却
        if bi < len(batches) - 1:
            print(f"\n  🧊 Cooling {BATCH_GAP}s...")
            time.sleep(BATCH_GAP)

    # ── 最终摘要（数据已增量保存到 csv_path）
    print(f"\n📄 {csv_path}")

    # 摘要
    print("\n📊 Summary:")
    total_ok = 0
    for dk in dim_order:
        dim_ok = sum(1 for r in all_results if r["dim"] == dk and r["status"] == "SUCCEEDED")
        dim_t = sum(1 for r in all_results if r["dim"] == dk)
        pct = dim_ok / dim_t * 100 if dim_t else 0
        bar = "█" * int(pct / 10) + "░" * (10 - int(pct / 10))
        print(f"  [{dim_names[dk]:8s}] {bar} {dim_ok}/{dim_t} ({pct:.0f}%)")
        total_ok += dim_ok
    total_all = sum(1 for r in all_results if r["dim"] in dim_order)
    overall = total_ok / total_all * 100 if total_all else 0
    obar = "█" * int(overall / 10) + "░" * (10 - int(overall / 10))
    print(f"  {'OVERALL':8s}  {obar} {total_ok}/{total_all} ({overall:.0f}%)")

    # 决策
    if overall >= 40:
        dec = "✅ GO — ≥40%, 进入 Phase 1"
    elif overall >= 30:
        dec = "⚠️ EXTEND — 30-39%, 延期一周"
    else:
        dec = "❌ HALT — <30%, 暂停重审"
    print(f"\n  → {dec}")

    # JSON
    summary_path = results_dir / f"summary_{ts}.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": ts,
            "overall_rate": round(overall, 1),
            "dimensions": {
                dk: {"name": dim_names[dk], "success_rate": round(
                    sum(1 for r in all_results if r["dim"] == dk and r["status"] == "SUCCEEDED")
                    / max(1, sum(1 for r in all_results if r["dim"] == dk)) * 100, 1
                )}
                for dk in dim_order
            },
            "decision": dec,
            "total_cases": total_all,
            "total_ok": total_ok,
        }, f, indent=2, ensure_ascii=False)
    print(f"📄 {summary_path}")


if __name__ == "__main__":
    main()
