#!/usr/bin/env python3
"""
Phase 0 — Test 02: 角色锁定一致性测试框架
目标：在 5 个维度上测量 HappyHorse 的角色一致性

5 个维度:
  T1 - 面部一致性 (face)
  T2 - 多镜头连贯 (multi_shot)
  T3 - 光影统一 (lighting)
  T4 - 衣着头饰 (costume)
  T5 - 背景空间 (background)

运行: python3 phase0/tests/test_02_consistency.py

输出: phase0/results/raw_<timestamp>.csv
"""

import os
import time
import json
import csv
import requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / "phase0" / ".env")

API_KEY = os.getenv("HAPPYHORSE_API_KEY", "")
BASE_URL = os.getenv("HAPPYHORSE_BASE_URL", "https://dashscope.aliyuncs.com")
SAMPLES_PER_DIM = int(os.getenv("SAMPLES_PER_DIM", "10"))
RESOLUTION = os.getenv("RESOLUTION", "720p")

T2V_ENDPOINT = "/api/v1/services/aigc/video-generation/video-synthesis"

# ── 统一角色锚点（Character Anchor）─────────────────────────────
# 所有测试共享同一个角色定义，确保一致性测量基准统一
CHARACTER_ANCHOR = {
    "name": "Lena",
    "traits": (
        "A young East Asian woman, 25 years old, "
        "long straight black hair reaching mid-back, "
        "almond-shaped dark brown eyes, small straight nose, "
        "fair skin with a subtle warm undertone, "
        "no visible scars, tattoos, or piercings. "
        "Character design sheet reference: consistent facial proportions."
    ),
    "default_outfit": "A tailored crimson red dress, knee-length, with a subtle V-neck, no patterns or embroidery.",
    "default_scene": "A sunlit urban garden with terracotta tiles, climbing ivy on a stone wall, warm afternoon light.",
}

# ── 测试维度 Prompt 变体 ────────────────────────────────────────
DIMENSIONS = {
    "t1_face": {
        "name": "面部一致性",
        "desc": "同一角色在不同 prompt 变体下，面部特征是否保持稳定",
        "prompts": [
            f"Character design sheet of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Front view, neutral expression, studio lighting.",
            f"Close-up portrait of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Three-quarter view, gentle smile, soft window light.",
            f"Profile shot of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Looking left, dramatic side lighting.",
            f"Medium shot of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Slight head tilt, curious expression, overcast lighting.",
            f"Extreme close-up of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Eyes only, reflection in eyes, cinematic lighting.",
            f"{CHARACTER_ANCHOR['name']} laughing: {CHARACTER_ANCHOR['traits']} Joyful expression, candid moment, golden hour light.",
            f"{CHARACTER_ANCHOR['name']} serious: {CHARACTER_ANCHOR['traits']} Stern expression, dramatic shadow across face, noir lighting.",
            f"{CHARACTER_ANCHOR['name']} surprised: {CHARACTER_ANCHOR['traits']} Eyes wide, mouth slightly open, bright flash lighting.",
            f"Beauty shot of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Soft glamour lighting, looking at camera, slight head turn.",
            f"{CHARACTER_ANCHOR['name']} in thought: {CHARACTER_ANCHOR['traits']} Looking down, contemplative, warm rim light.",
        ],
    },
    "t4_costume": {
        "name": "衣着头饰",
        "desc": "服装颜色、款式、配饰在跨场景中是否保持一致",
        "prompts": [
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Standing in {CHARACTER_ANCHOR['default_scene']} Full body shot.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Sitting on a modern office chair, medium shot.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Walking through {CHARACTER_ANCHOR['default_scene']} Dynamic motion shot.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Leaning against the stone wall, casual pose.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Back view, walking away from camera in {CHARACTER_ANCHOR['default_scene']}",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Close-up of dress detail, fabric texture visible.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Sitting on stairs, candid pose, golden hour.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Turning around, mid-turn motion capture.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} With arms crossed, confident stance, office background.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} Wearing {CHARACTER_ANCHOR['default_outfit']} Kneeling to pick up a flower in {CHARACTER_ANCHOR['default_scene']}",
        ],
    },
    "t2_multi_shot": {
        "name": "多镜头连贯",
        "desc": "不同景别和角度下角色是否保持一致",
        "prompts": [
            f"Wide establishing shot of {CHARACTER_ANCHOR['default_scene']} {CHARACTER_ANCHOR['name']} ({CHARACTER_ANCHOR['traits']}) wearing {CHARACTER_ANCHOR['default_outfit']} enters from left.",
            f"Medium shot of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} She pauses and looks around.",
            f"Close-up of {CHARACTER_ANCHOR['name']} face: {CHARACTER_ANCHOR['traits']} She notices something, eyebrows slightly raised.",
            f"Over-the-shoulder shot: {CHARACTER_ANCHOR['name']} ({CHARACTER_ANCHOR['traits']}) wearing {CHARACTER_ANCHOR['default_outfit']} looking at a rose bush.",
            f"Low angle shot of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} She reaches up toward a branch.",
            f"Tracking shot following {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} walking along the garden path.",
            f"Dutch angle shot of {CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Tension moment, she looks unsettled.",
            f"Wide shot, {CHARACTER_ANCHOR['name']} ({CHARACTER_ANCHOR['traits']}) wearing {CHARACTER_ANCHOR['default_outfit']} stands at garden center, rain begins.",
            f"POV shot: Looking at {CHARACTER_ANCHOR['name']} ({CHARACTER_ANCHOR['traits']}) wearing {CHARACTER_ANCHOR['default_outfit']} She extends hand toward camera.",
            f"Aerial top-down shot: {CHARACTER_ANCHOR['name']} ({CHARACTER_ANCHOR['traits']}) wearing {CHARACTER_ANCHOR['default_outfit']} lying on grass among flower petals.",
        ],
    },
    "t3_lighting": {
        "name": "光影统一",
        "desc": "同一场景的光照方向、色调、阴影是否一致",
        "prompts": [
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} in {CHARACTER_ANCHOR['default_scene']} Warm afternoon sunlight from upper right.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, now with soft overcast light, no harsh shadows.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, golden hour, long shadows, warm amber tones.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, morning light, cool blue ambient with warm sun streaks.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, twilight, soft purple-pink sky, ambient evening light.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, noon harsh sun, strong contrast, deep shadows.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, dappled light through tree leaves, moving shadow patterns.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, backlit by setting sun, rim light on hair.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, overcast with mist, soft diffused light, low visibility.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Same scene, indoor spill light from window, warm interior glow.",
        ],
    },
    "t5_background": {
        "name": "背景空间",
        "desc": "同一场景下背景元素、空间关系是否稳定",
        "prompts": [
            f"Establishing shot: {CHARACTER_ANCHOR['default_scene']} Empty, no character. Terracotta tiles, climbing ivy on stone wall.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Standing near the ivy-covered stone wall in {CHARACTER_ANCHOR['default_scene']}",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Sitting on a wooden bench in {CHARACTER_ANCHOR['default_scene']}",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} By the fountain in {CHARACTER_ANCHOR['default_scene']} Water flowing.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Near garden entrance archway, {CHARACTER_ANCHOR['default_scene']}",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} At the far end of {CHARACTER_ANCHOR['default_scene']} Stone steps visible.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Under the pergola, {CHARACTER_ANCHOR['default_scene']} Wisteria hanging.",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Next to terracotta pot with lavender, {CHARACTER_ANCHOR['default_scene']}",
            f"{CHARACTER_ANCHOR['name']}: {CHARACTER_ANCHOR['traits']} wearing {CHARACTER_ANCHOR['default_outfit']} Looking through iron gate into {CHARACTER_ANCHOR['default_scene']}",
            f"Wide shot of whole {CHARACTER_ANCHOR['default_scene']} {CHARACTER_ANCHOR['name']} ({CHARACTER_ANCHOR['traits']}) wearing {CHARACTER_ANCHOR['default_outfit']} at center.",
        ],
    },
}


def submit_task(prompt: str, task_id_prefix: str) -> dict:
    """提交一个生成任务，返回 task_id 和元数据"""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
    }
    payload = {
        "model": "happyhorse-1.0-t2v",
        "input": {"prompt": prompt},
        "parameters": {
            "size": "1280*720" if RESOLUTION == "720p" else "1920*1080",
            "duration": 5.0,
        },
    }
    try:
        resp = requests.post(
            f"{BASE_URL}{T2V_ENDPOINT}",
            json=payload,
            headers=headers,
            timeout=30,
        )
        if resp.status_code == 200:
            data = resp.json()
            task_id = data.get("output", {}).get("task_id", "")
            return {"ok": True, "task_id": task_id, "prompt": prompt}
        else:
            return {"ok": False, "error": resp.text[:300], "prompt": prompt}
    except Exception as e:
        return {"ok": False, "error": str(e), "prompt": prompt}


def poll_task(task_id: str, timeout_sec: int = 300) -> dict:
    """轮询任务直到完成或超时"""
    headers = {"Authorization": f"Bearer {API_KEY}"}
    endpoint = f"/api/v1/tasks/{task_id}"
    poll_interval = 10
    max_attempts = timeout_sec // poll_interval

    for i in range(max_attempts):
        time.sleep(poll_interval)
        try:
            resp = requests.get(f"{BASE_URL}{endpoint}", headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("output", {}).get("task_status", "")
                if status == "SUCCEEDED":
                    return {
                        "ok": True,
                        "status": "SUCCEEDED",
                        "video_url": data.get("output", {}).get("video_url", ""),
                        "elapsed_sec": (i + 1) * poll_interval,
                    }
                elif status in ("FAILED", "CANCELED"):
                    return {
                        "ok": False,
                        "status": status,
                        "error": data.get("output", {}).get("message", ""),
                    }
        except Exception as e:
            pass  # 容忍间歇性网络错误
    return {"ok": False, "status": "TIMEOUT", "error": f"Timeout after {timeout_sec}s"}


def run_dimension(dim_key: str, dim_info: dict) -> list[dict]:
    """跑一个完整维度的所有测试"""
    results = []
    print(f"\n{'─' * 50}")
    print(f"📐 [{dim_key}] {dim_info['name']}")
    print(f"   {dim_info['desc']}")
    print(f"   Samples: {len(dim_info['prompts'])}")
    print(f"{'─' * 50}")

    for i, prompt in enumerate(dim_info["prompts"]):
        idx = f"{dim_key}_s{i:02d}"
        print(f"  [{i+1}/{len(dim_info['prompts'])}] Submitting...", end=" ", flush=True)

        submit = submit_task(prompt, idx)
        if not submit["ok"]:
            print(f"❌ Submit failed: {submit.get('error', '')[:80]}")
            results.append({
                "dim": dim_key,
                "idx": i,
                "task_id": "",
                "status": "SUBMIT_FAILED",
                "video_url": "",
                "elapsed_sec": 0,
                "prompt": prompt[:200],
                "error": submit.get("error", ""),
            })
            continue

        task_id = submit["task_id"]
        print(f"task={task_id[:16]}...", end=" ", flush=True)

        poll = poll_task(task_id)
        if poll["ok"]:
            elapsed = poll.get("elapsed_sec", 0)
            print(f"✅ {elapsed}s")
        else:
            print(f"❌ {poll.get('status', '')}")

        results.append({
            "dim": dim_key,
            "idx": i,
            "task_id": task_id,
            "status": poll.get("status", "UNKNOWN"),
            "video_url": poll.get("video_url", ""),
            "elapsed_sec": poll.get("elapsed_sec", 0),
            "prompt": prompt[:200],
            "error": poll.get("error", ""),
        })

    succeeded = sum(1 for r in results if r["status"] == "SUCCEEDED")
    total = len(results)
    print(f"\n  ✅ {succeeded}/{total} succeeded ({succeeded/total*100:.0f}%)")

    return results


def save_results(all_results: list[dict], dim_order: list[str]):
    """保存结果到 CSV"""
    results_dir = PROJECT_ROOT / "phase0" / "results"
    results_dir.mkdir(exist_ok=True)

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = results_dir / f"raw_{ts}.csv"

    fieldnames = [
        "dim", "idx", "task_id", "status", "video_url",
        "elapsed_sec", "prompt", "error",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_results)

    print(f"\n📄 Results saved: {csv_path}")

    # 摘要
    summary = {}
    for dk in dim_order:
        dim_results = [r for r in all_results if r["dim"] == dk]
        ok = sum(1 for r in dim_results if r["status"] == "SUCCEEDED")
        summary[dk] = {"ok": ok, "total": len(dim_results)}
    print("\n📊 Summary:")
    total_ok = sum(s["ok"] for s in summary.values())
    total_all = sum(s["total"] for s in summary.values())
    for dk, s in summary.items():
        pct = s["ok"] / s["total"] * 100 if s["total"] else 0
        bar = "█" * int(pct / 10) + "░" * (10 - int(pct / 10))
        print(f"  [{DIMENSIONS[dk]['name']:12s}] {bar} {s['ok']:2d}/{s['total']:2d} ({pct:3.0f}%)")
    overall = total_ok / total_all * 100 if total_all else 0
    bar_overall = "█" * int(overall / 10) + "░" * (10 - int(overall / 10))
    print(f"  {'OVERALL':12s}  {bar_overall} {total_ok:2d}/{total_all:2d} ({overall:3.0f}%)")

    # 写 JSON 摘要供后续报告脚本用
    summary_path = results_dir / f"summary_{ts}.json"
    summary_data = {
        "timestamp": ts,
        "overall_rate": round(overall, 1),
        "dimensions": {
            dk: {
                "name": DIMENSIONS[dk]["name"],
                "success_rate": round(summary[dk]["ok"] / summary[dk]["total"] * 100, 1)
                if summary[dk]["total"] > 0 else 0,
            }
            for dk in dim_order
        },
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2, ensure_ascii=False)
    print(f"📄 Summary JSON: {summary_path}")

    return overall


def main():
    if not API_KEY or API_KEY == "sk-your-key-here":
        print("❌ 请先在 phase0/.env 中配置 HAPPYHORSE_API_KEY")
        return

    print("Phase 0 — Test 02: 角色锁定一致性测试")
    print(f"Test time: {datetime.now().isoformat()}")
    print(f"Resolution: {RESOLUTION}")

    # 阶段 A: 只跑最高优两个维度（T1 面部 + T4 衣着）
    # 阶段 B（调优后）: 补跑 T2 多镜头 + T3 光影 + T5 背景
    dim_order = ["t1_face", "t4_costume"]
    all_results = []

    for dk in dim_order:
        results = run_dimension(dk, DIMENSIONS[dk])
        all_results.extend(results)

    overall = save_results(all_results, dim_order)
    print(f"\n🏁 Phase 0 Test 02 complete. Overall: {overall:.0f}%")


if __name__ == "__main__":
    main()
