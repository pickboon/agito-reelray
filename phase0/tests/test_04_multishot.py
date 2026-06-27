#!/usr/bin/env python3
"""
Phase 0 — Test 04: 多镜头叙事连贯性测试
============================================
这是决定产品能否成立的核心测试。

设计逻辑：
  不是测 5 个独立镜头，是测 5 个连续镜头是否保持同一个角色的同一性。
  每个镜头是「同一个 Lena 在同一个场景的连续叙事」

测试场景：晨光咖啡馆
  S1 进场 — 远景，Lena 推门走进咖啡馆
  S2 近景 — 面部特写，Lena 微笑点单
  S3 中景 — Lena 坐在窗边，阳光照在脸上
  S4 动作 — Lena 端起咖啡杯，轻抿一口
  S5 退场 — Lena 起身离开，背影

两套测试：
  A) 纯文本 t2v（1.1）：5 个镜头都用 text-to-video，Prompt 中每次重复 LENA 描述
  B) 参考图 r2v（1.1）：S1 用 t2v 生成，S2-S5 用 r2v + S1 的参考帧锚定

运行: python3 phase0/tests/test_04_multishot.py [A|B]
"""

import os, sys, time, json, csv, requests
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / "phase0" / ".env")

API_KEY = os.getenv("HAPPYHORSE_API_KEY", "")
BASE_URL = os.getenv("HAPPYHORSE_BASE_URL", "https://dashscope.aliyuncs.com")
T2V_EP = "/api/v1/services/aigc/video-generation/video-synthesis"

# ========== 网络重试 ==========
def safe_req(method, url, max_tries=5, **kw):
    for i in range(max_tries):
        try:
            return (requests.post(url, **kw) if method == 'post' else requests.get(url, **kw))
        except requests.exceptions.ConnectionError as e:
            if i < max_tries - 1:
                print(f'    🔄 retry {i+1}/{max_tries}: {str(e)[:60]}')
                time.sleep(3)
            else:
                raise
        except Exception as e:
            if i < max_tries - 1:
                print(f'    🔄 retry {i+1}/{max_tries}: {str(e)[:60]}')
                time.sleep(5)
            else:
                raise

# ========== 角色锁定 ==========
LENA_FULL = (
    "Lena is a 25-year-old East Asian woman with long straight black hair reaching mid-back, "
    "almond-shaped dark brown eyes, small straight nose with defined cupid's bow, fair skin with warm undertone, "
    "oval face with gently pointed chin, medium natural arch eyebrows. Calm intelligent demeanor. "
    "Wearing a tailored crimson red knee-length dress, subtle V-neck, sleeveless, no patterns, matte fabric."
)

SCENE_FULL = (
    "Cozy minimalist coffee shop, morning, warm sunlight through large windows, "
    "wooden tables, terracotta tile floor, a few green plants, soft ambient light, shallow depth of field. "
    "Consistent warm color palette throughout."
)

# ========== 5 镜头 ==========
SHOTS = [
    ("S1_entry",  f"{LENA_FULL} {SCENE_FULL} "
                  "Wide shot, full body. Lena pushes open the glass door and walks into the coffee shop. "
                  "Natural stride, slight smile. Camera tracks her entrance. Consistent character."),
    ("S2_closeup", f"{LENA_FULL} {SCENE_FULL} "
                   "Close-up shot, face only, shallow depth of field. Lena looks at the menu board above the counter, "
                   "gentle smile, eyes scanning. Warm window light on her face. Consistent character."),
    ("S3_window",  f"{LENA_FULL} {SCENE_FULL} "
                   "Medium shot, waist up. Lena sits at a wooden table by the window. "
                   "Morning sunlight streams across her face and red dress. She gazes outside thoughtfully. "
                   "Soft bokeh background. Consistent character."),
    ("S4_sip",     f"{LENA_FULL} {SCENE_FULL} "
                   "Medium close-up, chest up. Lena lifts a white ceramic coffee cup to her lips, "
                   "takes a gentle sip. Her expression is peaceful and content. "
                   "Steam rises from the cup. Consistent character."),
    ("S5_exit",    f"{LENA_FULL} {SCENE_FULL} "
                   "Wide shot, back view. Lena stands up from her table, walks toward the door. "
                   "Her long black hair sways naturally with movement. "
                   "The red dress is visible from behind. She exits through the glass door. Consistent character."),
]

def submit_t2v(prompt, seed=42):
    h = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json", "X-DashScope-Async": "enable"}
    r = safe_req('post', f"{BASE_URL}{T2V_EP}", headers=h, timeout=30,
                 json={"model": "happyhorse-1.1-t2v", "input": {"prompt": prompt},
                       "parameters": {"size": "1280*720", "duration": 5, "seed": seed}})
    if r.status_code == 200:
        return r.json()["output"]["task_id"]
    raise Exception(f"Submit {r.status_code}: {r.text[:200]}")

def submit_r2v(prompt, ref_urls, seed=42):
    h = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json", "X-DashScope-Async": "enable"}
    r = safe_req('post', f"{BASE_URL}{T2V_EP}", headers=h, timeout=30,
                 json={"model": "happyhorse-1.1-r2v",
                       "input": {"prompt": prompt, "media": [{"url": u} for u in ref_urls]},
                       "parameters": {"size": "1280*720", "duration": 5, "seed": seed}})
    if r.status_code == 200:
        return r.json()["output"]["task_id"]
    raise Exception(f"Submit {r.status_code}: {r.text[:200]}")

def poll(tid, timeout_sec=220):
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        time.sleep(10)
        try:
            r = safe_req('get', f"{BASE_URL}/api/v1/tasks/{tid}", headers={"Authorization": f"Bearer {API_KEY}"}, timeout=15)
        except Exception as e:
            print(f'    ⚠️ poll err: {str(e)[:60]}')
            continue
        d = r.json()
        s = d["output"]["task_status"]
        if s == "SUCCEEDED":
            return s, d["output"].get("video_url", ""), d["output"].get("usage", {}), ""
        elif s == "FAILED":
            return s, "", {}, d["output"].get("message", "unknown")
    return "TIMEOUT", "", {}, "Poll timeout"

def run_mode(letter):
    cur_results = []
    if letter == 'A':
        print("=" * 70)
        print("A 组 — 纯文本 t2v (happyhorse-1.1-t2v)")
        print("=" * 70)
        for i, (sid, prompt) in enumerate(SHOTS):
            print(f"\n🎬 {sid.upper()} ({i+1}/5)")
            t0 = time.time()
            tid = submit_t2v(prompt, seed=42 + i)
            print(f"  task={tid}")
            st, url, usage, err = poll(tid)
            et = int(time.time() - t0)
            ok = "✅" if st == "SUCCEEDED" else "❌"
            print(f"  {ok} {st} ({et}s)", end="")
            if url: print(f" -> {url[:100]}...")
            else: print(f" | {err[:120]}")
            cur_results.append({"shot": sid, "task_id": tid, "status": st, "video_url": url,
                                "elapsed": et, "error": err, "prompt": prompt[:200], "mode": f"{letter}_t2v"})
            if i < 4:
                print("  🧊 30s..."); time.sleep(30)
    else:
        # B组: S1 t2v, S2-S5 r2v
        print("=" * 70)
        print("B 组 — 参考图锚定 (S1 t2v + S2-S5 r2v)")
        print("=" * 70)
        print(f"\n🎬 S1_ENTRY (1/5) — t2v")
        t0 = time.time()
        tid = submit_t2v(SHOTS[0][1], seed=42)
        print(f"  task={tid}")
        st, ref_url, usage, err = poll(tid)
        et = int(time.time() - t0)
        print(f"  {'✅' if st == 'SUCCEEDED' else '❌'} {st} ({et}s)")
        cur_results.append({"shot": SHOTS[0][0], "task_id": tid, "status": st,
                            "video_url": ref_url, "elapsed": et, "error": err,
                            "prompt": SHOTS[0][1][:200], "mode": "B_t2v"})
        if not ref_url:
            print("  ⚠️  S1 失败，B 组中止"); return cur_results
        print(f"  🔗 锚点: {ref_url[:100]}...")
        print("  🧊 30s..."); time.sleep(30)
        refs = [ref_url]
        for i, (sid, prompt) in enumerate(SHOTS[1:], 1):
            print(f"\n🎬 {sid.upper()} ({i+1}/5) — r2v")
            t0 = time.time()
            try:
                tid = submit_r2v(prompt, refs, seed=42 + i)
            except Exception as e:
                print(f"  ❌ Submit: {e}")
                cur_results.append({"shot": sid, "task_id": "", "status": "SUBMIT_FAIL",
                                    "video_url": "", "elapsed": 0, "error": str(e),
                                    "prompt": prompt[:200], "mode": "B_r2v"})
                continue
            print(f"  task={tid}")
            st, url, usage, err = poll(tid)
            et = int(time.time() - t0)
            ok = "✅" if st == "SUCCEEDED" else "❌"
            print(f"  {ok} {st} ({et}s)", end="")
            if url: print(f" -> {url[:100]}...")
            else: print(f" | {err[:120]}")
            cur_results.append({"shot": sid, "task_id": tid, "status": st, "video_url": url,
                                "elapsed": et, "error": err, "prompt": prompt[:200], "mode": "B_r2v"})
            if i < 4:
                print("  🧊 30s..."); time.sleep(30)
    return cur_results

def save_results(results, mode):
    d = PROJECT_ROOT / "phase0" / "results"
    d.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    p = d / f"multishot_{mode}_{ts}.csv"
    with open(p, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(["shot","mode","task_id","status","video_url","elapsed","error","prompt"])
        for r in results:
            w.writerow([r["shot"], r["mode"], r["task_id"], r["status"], r["video_url"],
                        r["elapsed"], r["error"], r["prompt"]])
    print(f"\n📊 结果已保存: {p}")
    ok = sum(1 for r in results if r["status"] == "SUCCEEDED")
    print(f"📈 成功率: {ok}/{len(results)} ({ok/max(len(results),1)*100:.0f}%)")
    for r in results:
        e = "✅" if r["status"] == "SUCCEEDED" else "❌"
        print(f"  {e} {r['shot']:12s} {r['status']:16s} {r['elapsed']}s")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "A"
    if mode.upper() in ("A", "B"):
        results = run_mode(mode.upper())
        save_results(results, f"{mode.upper()}_t2v" if mode.upper() == 'A' else "B_r2v")
    else:
        print("用法: python3 test_04_multishot.py [A|B]")
