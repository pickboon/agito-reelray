#!/usr/bin/env python3
"""
Phase 0 — 全面摸底测试: HappyHorse 特性/秉性/边界
5 维度深入 + 提示词工程 + 边界压力

Batch 策略: 每批 2 条, 间隔 60s, 增量写 CSV, 保留全部 task_id

维度:
  T1 面部 — 表情/角度/光线对面部一致性的影响
  T2 多镜头 — 同角色 wide/medium/closeup 连贯性
  T3 光影 — 5 种光照条件下的角色漂移
  T4 衣着 — 视角/动作/饰品对衣着锚定的影响
  T5 背景 — 场景切换时的角色保持
  TP 提示词 — 详细度/负向词/风格指令的影响
  TE 边界 — 运动模糊/极端角度/多角色

运行: python3 phase0/tests/run_probe.py
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
T2V = "/api/v1/services/aigc/video-generation/video-synthesis"

BATCH_SIZE = 2
BATCH_GAP = 60
POLL_INTERVAL = 10
TASK_TIMEOUT = 200

# ═══════════════════════════════════════════════════
# 角色基线（短版 + 长版）
# ═══════════════════════════════════════════════════
BASE_SHORT = (
    "Lena: East Asian woman, 25, long straight black hair to mid-back, "
    "almond-shaped dark brown eyes, small straight nose, fair skin warm undertone."
)
BASE_LONG = (
    "Lena is a 25-year-old East Asian woman with long straight black hair "
    "reaching mid-back, almond-shaped dark brown eyes with slight epicanthic fold, "
    "a small straight nose with a rounded tip, defined cupid's bow on medium lips, "
    "fair skin with subtle warm yellow undertone, oval face shape with gently pointed chin, "
    "medium eyebrows with a natural arch. She has a calm, intelligent demeanor."
)
OUTFIT = "a tailored crimson red knee-length dress, subtle V-neck, sleeveless, no patterns, matte fabric with slight drape"
OUTFIT_ALT = "a navy blue silk blouse with mandarin collar, paired with cream white wide-leg trousers"
SCENE_GARDEN = "a sunlit urban garden with terracotta tiles, climbing ivy on a stone wall, warm afternoon light, shallow depth of field"

# ═══════════════════════════════════════════════════
# 测试矩阵
# ═══════════════════════════════════════════════════
CASES = [
    # ── T1 面部: 表情梯度 ──
    {"id":"t1_e1","dim":"t1_face","group":"expression",
     "prompt":f"Character reference sheet of {BASE_LONG} Front view, completely neutral expression, passport-photo style, even studio lighting, white background."},
    {"id":"t1_e2","dim":"t1_face","group":"expression",
     "prompt":f"{BASE_LONG} Gentle closed-lip smile, slight cheek raise, eyes relaxed, three-quarter view, soft window light from left."},
    {"id":"t1_e3","dim":"t1_face","group":"expression",
     "prompt":f"{BASE_LONG} Slightly surprised expression, eyebrows raised 2mm, lips parted 5mm, eyes slightly wide, front view, even lighting."},
    # ── T1 面部: 角度梯度 ──
    {"id":"t1_a1","dim":"t1_face","group":"angle",
     "prompt":f"{BASE_LONG} Profile view looking left, nose silhouette clearly visible, one eye visible, studio rim lighting, black background."},
    {"id":"t1_a2","dim":"t1_face","group":"angle",
     "prompt":f"{BASE_LONG} Looking up at 30 degrees, chin slightly raised, neck visible, front view from below, skylight illumination."},
    {"id":"t1_a3","dim":"t1_face","group":"angle",
     "prompt":f"{BASE_LONG} Three-quarter back view, looking over right shoulder, one eye visible, hair partially covering face, natural daylight."},
    # ── T1 面部: 光照对面部影响 ──
    {"id":"t1_l1","dim":"t1_face","group":"lighting_face",
     "prompt":f"{BASE_LONG} Neutral front view. Lit by a single warm candle from below, dramatic shadows, dark background. Same facial structure."},
    {"id":"t1_l2","dim":"t1_face","group":"lighting_face",
     "prompt":f"{BASE_LONG} Neutral front view. Lit by harsh overhead fluorescent light, sharp shadows under nose and chin, clinical white background."},

    # ── T2 多镜头: 同角色不同景别 ──
    {"id":"t2_s1","dim":"t2_multi","group":"shot_scale",
     "prompt":f"Extreme wide shot establishing view: {BASE_SHORT} Wearing {OUTFIT} Standing in {SCENE_GARDEN} Full body visible, environmental context clear."},
    {"id":"t2_s2","dim":"t2_multi","group":"shot_scale",
     "prompt":f"Medium shot knee-up: {BASE_SHORT} Wearing {OUTFIT} In {SCENE_GARDEN} Arms relaxed at sides, looking at camera."},
    {"id":"t2_s3","dim":"t2_multi","group":"shot_scale",
     "prompt":f"Close-up shot head and shoulders: {BASE_LONG} In {SCENE_GARDEN} Soft expression, background blurred with bokeh."},
    # ── T2 多镜头: 动作连续性 ──
    {"id":"t2_m1","dim":"t2_multi","group":"motion",
     "prompt":f"{BASE_SHORT} Wearing {OUTFIT} Walking slowly toward camera through {SCENE_GARDEN} Natural gait, slight breeze moving hair."},
    {"id":"t2_m2","dim":"t2_multi","group":"motion",
     "prompt":f"{BASE_SHORT} Wearing {OUTFIT} Turning to look at something off-screen to the right, {SCENE_GARDEN} Reaction shot."},

    # ── T3 光影: 5 种光照条件下的角色漂移 ──
    {"id":"t3_01","dim":"t3_lighting","group":"lighting",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing in {SCENE_GARDEN} Golden hour warm sunset light, long shadows, warm color temperature 3200K."},
    {"id":"t3_02","dim":"t3_lighting","group":"lighting",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing in {SCENE_GARDEN} Overcast noon, soft diffused light, neutral 5500K color temperature, no shadows."},
    {"id":"t3_03","dim":"t3_lighting","group":"lighting",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing in {SCENE_GARDEN} Deep blue moonlight, cool 8000K color temperature, rim light from above, dark shadows."},
    {"id":"t3_04","dim":"t3_lighting","group":"lighting",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing in {SCENE_GARDEN} Harsh midday sun from directly above, strong shadows under chin and nose, high contrast."},
    {"id":"t3_05","dim":"t3_lighting","group":"lighting",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing in {SCENE_GARDEN} Neon pink and cyan cross-lighting from both sides, cyberpunk aesthetic, dark background."},

    # ── T4 衣着: 视角/动作/饰品对锚定的影响 ──
    {"id":"t4_v1","dim":"t4_costume","group":"view",
     "prompt":f"Full body shot from back: {BASE_SHORT} Wearing {OUTFIT} Back view, hair falling down back, {SCENE_GARDEN} Dress back detail visible."},
    {"id":"t4_v2","dim":"t4_costume","group":"view",
     "prompt":f"Side profile full body: {BASE_SHORT} Wearing {OUTFIT} Side view, {SCENE_GARDEN} Dress silhouette clearly visible."},
    {"id":"t4_a1","dim":"t4_costume","group":"accessory",
     "prompt":f"{BASE_SHORT} Wearing {OUTFIT} PLUS a delicate gold chain necklace with a small sapphire pendant. {SCENE_GARDEN} Medium shot, necklace clearly visible."},
    {"id":"t4_c1","dim":"t4_costume","group":"change",
     "prompt":f"{BASE_LONG} Changed outfit to {OUTFIT_ALT} Full body shot in {SCENE_GARDEN} Face must remain identical to character reference, only clothing changed."},

    # ── T5 背景: 场景切换角色保持 ──
    {"id":"t5_01","dim":"t5_bg","group":"scene",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing on a white sand beach, turquoise ocean behind, bright sunny day, palm trees in distance."},
    {"id":"t5_02","dim":"t5_bg","group":"scene",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Sitting in a modern minimalist office, white desk, large window with city skyline view, cool daylight."},
    {"id":"t5_03","dim":"t5_bg","group":"scene",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} Standing in a rainy neon-lit Tokyo street at night, reflections on wet pavement, umbrella not needed, moody atmosphere."},

    # ── TP 提示词工程 ──
    {"id":"tp_01","dim":"tp_prompt","group":"detail",
     "prompt":f"Character reference: {BASE_SHORT} {OUTFIT} Full body in {SCENE_GARDEN}"},
    {"id":"tp_02","dim":"tp_prompt","group":"detail",
     "prompt":f"Character reference: {BASE_LONG} {OUTFIT} Full body in {SCENE_GARDEN}"},
    {"id":"tp_03","dim":"tp_prompt","group":"negative",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} In {SCENE_GARDEN} IMPORTANT: do NOT change facial features, do NOT alter nose shape, do NOT modify eye spacing, do NOT change hair color or style, do NOT alter skin tone, do NOT add or remove accessories."},
    {"id":"tp_04","dim":"tp_prompt","group":"style",
     "prompt":f"{BASE_LONG} Wearing {OUTFIT} In {SCENE_GARDEN} Cinematic style, shot on ARRI Alexa 65, 35mm lens f/1.4, film grain, professional color grading, 24fps motion cadence."},

    # ── TE 边界压力 ──
    {"id":"te_01","dim":"te_edge","group":"motion_blur",
     "prompt":f"{BASE_SHORT} Wearing {OUTFIT} Running through {SCENE_GARDEN} Fast motion, hair flowing behind, dynamic action shot, slight motion blur."},
    {"id":"te_02","dim":"te_edge","group":"extreme_angle",
     "prompt":f"{BASE_SHORT} Wearing {OUTFIT} Extreme low angle shot from ground level looking up, wide angle lens distortion, sky visible behind, {SCENE_GARDEN}"},
    {"id":"te_03","dim":"te_edge","group":"multi_char",
     "prompt":f"Two people talking: {BASE_SHORT} Wearing {OUTFIT} facing a tall Caucasian man in business suit, both visible in frame, {SCENE_GARDEN}, medium two-shot."},
]

# ═══════════════════════════════════════════════════
# 工具函数
# ═══════════════════════════════════════════════════

def submit(prompt: str) -> dict:
    headers = {"Authorization": f"Bearer {API_KEY}","X-DashScope-Async": "enable","Content-Type": "application/json"}
    payload = {"model": "happyhorse-1.0-t2v","input": {"prompt": prompt},"parameters": {"duration": 5}}
    try:
        r = requests.post(f"{BASE_URL}{T2V}", json=payload, headers=headers, timeout=30)
        if r.status_code == 200:
            return {"ok": True, "task_id": r.json()["output"]["task_id"]}
        return {"ok": False, "error": f"HTTP {r.status_code}: {r.text[:200]}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def poll(task_id: str, timeout: int = TASK_TIMEOUT) -> dict:
    headers = {"Authorization": f"Bearer {API_KEY}"}
    started = time.time()
    while time.time() - started < timeout:
        time.sleep(POLL_INTERVAL)
        try:
            r = requests.get(f"{BASE_URL}/api/v1/tasks/{task_id}", headers=headers, timeout=15)
            if r.status_code != 200: continue
            d = r.json()
            s = d["output"]["task_status"]
            if s == "SUCCEEDED":
                return {"ok": True, "status": "SUCCEEDED",
                        "video_url": d["output"].get("video_url", ""),
                        "elapsed": round(time.time() - started),
                        "usage": d.get("usage", {}),
                        "request_id": d.get("request_id", "")}
            elif s in ("FAILED", "CANCELED"):
                return {"ok": False, "status": s,
                        "error": d["output"].get("message", ""),
                        "code": d["output"].get("code", ""),
                        "elapsed": round(time.time() - started)}
        except Exception:
            pass
    return {"ok": False, "status": "TIMEOUT", "error": "Timeout"}


# ═══════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════

def main():
    if not API_KEY or API_KEY == "sk-your-key-here":
        print("❌ 配置 HAPPYHORSE_API_KEY"); return

    results_dir = PROJECT_ROOT / "phase0" / "results"
    results_dir.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_path = results_dir / f"probe_{ts}.csv"
    fields = ["dim","case_id","task_id","status","video_url","elapsed","group","prompt","error","usage","request_id"]

    def save(results):
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fields)
            w.writeheader(); w.writerows(results)

    batches = [CASES[i:i+BATCH_SIZE] for i in range(0, len(CASES), BATCH_SIZE)]
    all_results = []
    dim_names = { "t1_face":"面部深入","t2_multi":"多镜头","t3_lighting":"光影",
                  "t4_costume":"衣着深入","t5_bg":"背景切换","tp_prompt":"提示词工程","te_edge":"边界压力" }

    print("═" * 64)
    print(f"Phase 0 — HappyHorse 全面摸底")
    print(f"  Cases: {len(CASES)} | Batches: {len(batches)} | Batch size: {BATCH_SIZE}")
    print(f"  Gap: {BATCH_GAP}s | Poll: {POLL_INTERVAL}s | Timeout: {TASK_TIMEOUT}s")
    print("═" * 64)

    for bi, batch in enumerate(batches):
        eta_min = ((len(batches)-bi-1) * (BATCH_GAP + 120)) // 60
        print(f"\n{'─'*56}")
        print(f"📦 Batch {bi+1}/{len(batches)} ({len(batch)} cases) | ETA ~{eta_min}min")
        print(f"{'─'*56}")

        # Submit
        tasks = []
        for case in batch:
            print(f"  🔄 [{case['id']}] {case['group'][:12]}...", end=" ", flush=True)
            r = submit(case["prompt"])
            if r["ok"]:
                print(f"tid={r['task_id']}")
                tasks.append({"case": case, "task_id": r["task_id"]})
            else:
                print(f"❌ {r['error'][:80]}")
                all_results.append({"dim":case["dim"],"case_id":case["id"],"task_id":"",
                    "status":"SUBMIT_FAILED","video_url":"","elapsed":0,
                    "group":case["group"],"prompt":case["prompt"],"error":r["error"],
                    "usage":"","request_id":""})
                save(all_results)

        # Poll
        for t in tasks:
            case = t["case"]
            print(f"  ⏳ [{case['id']}] Polling...", end=" ", flush=True)
            r = poll(t["task_id"])
            if r["ok"]:
                print(f"✅ {r['elapsed']}s")
            else:
                print(f"❌ {r.get('status','ERR')} {r.get('error','')[:60]}")
            all_results.append({"dim":case["dim"],"case_id":case["id"],
                "task_id":t["task_id"],"status":r.get("status","UNKNOWN"),
                "video_url":r.get("video_url",""),"elapsed":r.get("elapsed",0),
                "group":case["group"],"prompt":case["prompt"],
                "error":r.get("error",""),"usage":json.dumps(r.get("usage",{})),
                "request_id":r.get("request_id","")})
            save(all_results)

        # Cool
        if bi < len(batches) - 1:
            print(f"\n  🧊 {BATCH_GAP}s...")
            time.sleep(BATCH_GAP)

    # ═══════════════════════════════════════════════
    # Report
    # ═══════════════════════════════════════════════
    print(f"\n{'═'*64}")
    print(f"📄 {csv_path}")
    print(f"{'═'*64}\n📊 PROBE REPORT\n{'═'*64}")

    report_by_dim = {}
    for dk in dim_names:
        dim_results = [r for r in all_results if r["dim"] == dk]
        ok = sum(1 for r in dim_results if r["status"] == "SUCCEEDED")
        total = len(dim_results)
        avg_elapsed = sum(r["elapsed"] for r in dim_results if r["elapsed"]) / max(ok, 1)
        report_by_dim[dk] = {"ok":ok,"total":total,"avg":avg_elapsed}

        bar = "█"*max(1,int(ok/total*20)) + "░"*max(0,20-int(ok/total*20))
        pct = ok/total*100 if total else 0
        print(f"  {dim_names[dk]:10s} {bar} {ok}/{total} ({pct:.0f}%)  avg={avg_elapsed:.0f}s")

    # By group
    from collections import defaultdict
    group_data = defaultdict(lambda: {"ok":0,"total":0})
    for r in all_results:
        g = r.get("group","unknown")
        group_data[g]["total"] += 1
        if r["status"] == "SUCCEEDED": group_data[g]["ok"] += 1

    print(f"\n  Group breakdown:")
    for g, d in sorted(group_data.items()):
        ok, t = d["ok"], d["total"]
        print(f"    {g:16s}: {ok}/{t} {'✅' if ok==t else '⚠️'}")

    # Overall
    total_ok = sum(1 for r in all_results if r["status"] == "SUCCEEDED")
    total_all = len(all_results)
    overall = total_ok/total_all*100 if total_all else 0
    print(f"\n  OVERALL: {total_ok}/{total_all} ({overall:.0f}%)")

    # Save report JSON
    rpt = {
        "timestamp": ts, "overall_rate": round(overall,1),
        "dimensions": {dk: {"name": dim_names[dk], "rate": round(v["ok"]/max(1,v["total"])*100,1), "avg_elapsed_s": round(v["avg"],1)} for dk, v in report_by_dim.items()},
        "groups": {g: {"rate": round(d["ok"]/max(1,d["total"])*100,1), "ok": d["ok"], "total": d["total"]} for g,d in sorted(group_data.items())},
        "total_ok": total_ok, "total_all": total_all
    }
    rpt_path = results_dir / f"probe_report_{ts}.json"
    with open(rpt_path, "w", encoding="utf-8") as f:
        json.dump(rpt, f, indent=2, ensure_ascii=False)
    print(f"📄 {rpt_path}")


if __name__ == "__main__":
    main()
