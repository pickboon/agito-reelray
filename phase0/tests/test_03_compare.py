#!/usr/bin/env python3
"""
Phase 0 — HappyHorse 1.0 vs 1.1 对比测试
A组: 相同 prompt + seed，纯文本描述，测 1.1 基础一致性提升
B组: 1.1 参考图模式（1.0 没有的能力，Phase 1 前定性确认即可）

运行: python3 phase0/tests/test_03_compare.py
输出: phase0/results/compare_<timestamp>.csv
"""

import os, sys, time, json, csv, requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / "phase0" / ".env")

API_KEY = os.getenv("HAPPYHORSE_API_KEY", "")
BASE_URL = os.getenv("HAPPYHORSE_BASE_URL", "https://dashscope.aliyuncs.com")
T2V_ENDPOINT = os.getenv("HAPPYHORSE_T2V_ENDPOINT", "/api/v1/services/aigc/video-generation/video-synthesis")

LENA = ("Lena is a 25-year-old East Asian woman with long straight black hair reaching mid-back, "
        "almond-shaped dark brown eyes, small straight nose, defined cupid's bow, fair skin warm undertone, "
        "oval face with gently pointed chin, medium natural arch eyebrows. Calm intelligent demeanor.")

DRESS = ("Wearing a tailored crimson red knee-length dress, subtle V-neck, sleeveless, "
         "no patterns, matte fabric with slight drape")

SCENE = ("sunlit urban garden with terracotta tiles, climbing ivy on a stone wall, "
         "warm afternoon light, shallow depth of field")

# A组: 7 对 (1.0 vs 1.1)，相同 prompt + seed
CASES = [
    ("a1_neutral",  "happyhorse-1.0-t2v",  f"{LENA} Front view, neutral expression, passport style, even studio lighting, white background. {DRESS}", 42),
    ("a1_neutral",  "happyhorse-1.1-t2v",  f"{LENA} Front view, neutral expression, passport style, even studio lighting, white background. {DRESS}", 42),
    ("a2_profile",  "happyhorse-1.0-t2v",  f"{LENA} Profile left, nose silhouette visible, studio rim lighting, black background. {DRESS}", 42),
    ("a2_profile",  "happyhorse-1.1-t2v",  f"{LENA} Profile left, nose silhouette visible, studio rim lighting, black background. {DRESS}", 42),
    ("a3_wide",     "happyhorse-1.0-t2v",  f"{LENA} {DRESS} Extreme wide shot, full body, {SCENE}", 42),
    ("a3_wide",     "happyhorse-1.1-t2v",  f"{LENA} {DRESS} Extreme wide shot, full body, {SCENE}", 42),
    ("a4_walk",     "happyhorse-1.0-t2v",  f"{LENA} {DRESS} Walking slowly toward camera, {SCENE} Natural gait, slight breeze.", 42),
    ("a4_walk",     "happyhorse-1.1-t2v",  f"{LENA} {DRESS} Walking slowly toward camera, {SCENE} Natural gait, slight breeze.", 42),
    ("a5_golden",   "happyhorse-1.0-t2v",  f"{LENA} {DRESS} Standing in {SCENE} Golden hour sunset light, long shadows, warm 3200K.", 42),
    ("a5_golden",   "happyhorse-1.1-t2v",  f"{LENA} {DRESS} Standing in {SCENE} Golden hour sunset light, long shadows, warm 3200K.", 42),
    ("a6_moon",     "happyhorse-1.0-t2v",  f"{LENA} {DRESS} Standing in {SCENE} Deep blue moonlight, cool 8000K, rim light above.", 42),
    ("a6_moon",     "happyhorse-1.1-t2v",  f"{LENA} {DRESS} Standing in {SCENE} Deep blue moonlight, cool 8000K, rim light above.", 42),
    ("a7_neon",     "happyhorse-1.0-t2v",  f"{LENA} {DRESS} Standing in {SCENE} Neon pink and cyan cross-lighting, cyberpunk, dark.", 42),
    ("a7_neon",     "happyhorse-1.1-t2v",  f"{LENA} {DRESS} Standing in {SCENE} Neon pink and cyan cross-lighting, cyberpunk, dark.", 42),
]

def submit(model, prompt, seed):
    r = requests.post(
        f"{BASE_URL}{T2V_ENDPOINT}",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json", "X-DashScope-Async": "enable"},
        json={"model": model, "input": {"prompt": prompt}, "parameters": {"size": "1280*720", "duration": 5, "seed": seed}},
        timeout=30
    )
    if r.status_code == 200:
        return r.json()["output"]["task_id"]
    raise Exception(f"Submit {r.status_code}: {r.text[:150]}")

def poll(tid):
    for _ in range(25):
        time.sleep(10)
        r = requests.get(f"{BASE_URL}/api/v1/tasks/{tid}", headers={"Authorization": f"Bearer {API_KEY}"}, timeout=10)
        d = r.json()
        s = d["output"]["task_status"]
        if s == "SUCCEEDED":
            return s, d["output"].get("video_url", ""), d["output"].get("usage", {})
        elif s == "FAILED":
            return s, "", d["output"].get("message", "")
    return "TIMEOUT", "", ""

results_dir = PROJECT_ROOT / "phase0" / "results"
results_dir.mkdir(parents=True, exist_ok=True)
ts = datetime.now().strftime("%Y%m%d_%H%M%S")
csv_path = results_dir / f"compare_{ts}.csv"

with open(csv_path, 'w', newline='') as f:
    csv.writer(f).writerow(["case_id", "model", "version", "task_id", "status", "video_url", "elapsed", "prompt_preview", "error", "seed"])

print(f"\n{'='*60}")
print(f"Phase 0 — 1.0 vs 1.1 对比 (14 cases, 7 pairs)")
print(f"{'='*60}\n")

for i in range(0, len(CASES), 2):
    batch = CASES[i:i+2]
    bn = i // 2 + 1
    print(f"📦 Pair {bn}/7 ({batch[0][0]}):")
    
    submitted = []
    for case_id, model, prompt, seed in batch:
        ver = "1.0" if "1.0" in model else "1.1"
        print(f"  🔄 {ver} submit...", end='', flush=True)
        try:
            tid = submit(model, prompt, seed)
            print(f" tid={tid[:16]}")
            submitted.append((case_id, model, ver, tid, prompt, seed, time.time()))
        except Exception as e:
            print(f" ❌ {e}")
            with open(csv_path, 'a', newline='') as f:
                csv.writer(f).writerow([case_id, model, ver, "", "SUBMIT_FAILED", "", 0, prompt[:80], str(e)[:100], seed])
    
    for case_id, model, ver, tid, prompt, seed, t0 in submitted:
        print(f"  ⏳ {ver} poll...", end='', flush=True)
        try:
            status, vurl, extra = poll(tid)
            elapsed = int(time.time() - t0)
            if status == "SUCCEEDED":
                print(f" ✅ {elapsed}s")
            elif status == "FAILED":
                print(f" ❌ {str(extra)[:50]}")
            else:
                print(f" ⏰ TIMEOUT")
        except Exception as e:
            status, vurl, elapsed, extra = "POLL_ERROR", "", 0, str(e)[:100]
            print(f" ❌ {e}")
        with open(csv_path, 'a', newline='') as f:
            csv.writer(f).writerow([case_id, model, ver, tid, status, vurl, elapsed, prompt[:120], str(extra)[:200], seed])
    
    if bn < 7:
        print(f"  🧊 60s...")
        time.sleep(60)

print(f"\n✅ 对比完成: {csv_path}")