#!/usr/bin/env python3
"""
Phase 0 — Test 01: HappyHorse API 连通性测试
目标：验证 API Key 可用、能正确调用文生视频、获取响应

运行: python3 phase0/tests/test_01_connectivity.py
"""

import os
import time
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / "phase0" / ".env")

API_KEY = os.getenv("HAPPYHORSE_API_KEY", "")
BASE_URL = os.getenv("HAPPYHORSE_BASE_URL", "https://dashscope.aliyuncs.com")

# HappyHorse 百炼 API 端点（文本生成视频）
# 参考: https://help.aliyun.com/zh/model-studio/
T2V_ENDPOINT = "/api/v1/services/aigc/video-generation/video-synthesis"


def test_text_to_video():
    """测试文生视频基本调用"""
    print("=" * 60)
    print("Test 1: 文生视频 (Text to Video)")
    print("=" * 60)

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",  # 异步模式
    }

    payload = {
        "model": "happyhorse-1.0-t2v",
        "input": {
            "prompt": "A young woman with long black hair, wearing a red dress, standing in a sunlit garden, cinematic lighting, shallow depth of field, 4K quality. Character design sheet, front view.",
        },
        "parameters": {
            "size": "1280*720",
            "duration": 5.0,  # 5 秒
        },
    }

    print(f"Endpoint: {BASE_URL}{T2V_ENDPOINT}")
    print(f"Model: happyhorse-1.0")
    print(f"Prompt: {payload['input']['prompt'][:80]}...")
    print()

    try:
        resp = requests.post(
            f"{BASE_URL}{T2V_ENDPOINT}",
            json=payload,
            headers=headers,
            timeout=30,
        )
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            task_id = data.get("output", {}).get("task_id", "")
            print(f"✅ Task submitted: {task_id}")
            return task_id
        else:
            print(f"❌ Error: {resp.text[:500]}")
            return None
    except requests.exceptions.Timeout:
        print("❌ Timeout")
        return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None


def test_image_to_video():
    """测试图生视频基本调用"""
    print("\n" + "=" * 60)
    print("Test 2: 图生视频 (Image to Video)")
    print("=" * 60)
    print("⚠️ 需要先有角色参考图 URL，Phase 0 Day 2-3 执行")
    print("(本测试依赖 Test 1 的结果，用生成的首帧作为参考图)")
    return None


def check_task_status(task_id: str):
    """轮询任务状态"""
    if not task_id:
        return

    print("\n" + "=" * 60)
    print(f"Polling task: {task_id}")
    print("=" * 60)

    headers = {"Authorization": f"Bearer {API_KEY}"}
    endpoint = f"/api/v1/tasks/{task_id}"
    max_polls = 30  # 最多等 5 分钟
    poll_interval = 10  # 每 10 秒查一次

    for i in range(max_polls):
        time.sleep(poll_interval)
        try:
            resp = requests.get(
                f"{BASE_URL}{endpoint}",
                headers=headers,
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                status = data.get("output", {}).get("task_status", "")
                elapsed = (i + 1) * poll_interval
                print(f"  [{elapsed}s] Status: {status}")

                if status in ("SUCCEEDED",):
                    video_url = data.get("output", {}).get("video_url", "")
                    print(f"✅ Video ready: {video_url}")
                    return data
                elif status in ("FAILED", "CANCELED"):
                    print(f"❌ Task {status}: {data.get('output', {}).get('message', '')}")
                    return None
            else:
                print(f"  ⚠️ HTTP {resp.status_code}")
        except Exception as e:
            print(f"  ⚠️ Poll error: {e}")

    print("❌ Timeout: task did not complete in 5 minutes")
    return None


def main():
    if not API_KEY or API_KEY == "sk-your-key-here":
        print("❌ 请先在 phase0/.env 中配置 HAPPYHORSE_API_KEY")
        return

    print("Phase 0 — Test 01: HappyHorse API 连通性测试")
    print()

    task_id = test_text_to_video()
    result = check_task_status(task_id)

    if result:
        print("\n✅ 连通性测试通过")
    else:
        print("\n❌ 连通性测试未通过（需要排查 Key/Endpoint/权限）")


if __name__ == "__main__":
    main()
