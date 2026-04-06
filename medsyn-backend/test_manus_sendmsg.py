"""
Test: create a task, wait 30s, send a follow-up message, check response.
Run: python test_manus_sendmsg.py
"""
import asyncio
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

BASE = "https://api.manus.ai/v2"
KEY = os.getenv("MANUS_API_KEY", "")
HEADERS = {"x-manus-api-key": KEY, "Content-Type": "application/json"}


async def main():
    # 1. Create a simple medical task
    print("Creating task...")
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{BASE}/task.create", headers=HEADERS, json={
            "message": {"content": "Investigate this patient: 45yo woman, West Africa, jaundice + fever + splenomegaly + dark urine for 3 weeks. Search PubMed and Orphanet for differential diagnoses."}
        })
        data = r.json()
        print("Create response:", json.dumps(data, indent=2))
        task_id = data.get("task_id")
        if not task_id:
            print("FAILED — no task_id")
            return

    # 2. Wait 30 seconds for Manus to start working
    print(f"\nTask ID: {task_id}")
    print("Waiting 30s for Manus to start working...")
    await asyncio.sleep(30)

    # 3. Send a follow-up message asking for progress
    print("\nSending follow-up: what have you done so far?")
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.post(f"{BASE}/task.sendMessage", headers=HEADERS, json={
            "task_id": task_id,
            "message": {"content": "What steps have you completed so far? Reply in one sentence."}
        })
        print("sendMessage status:", r.status_code)
        print("sendMessage response:", json.dumps(r.json(), indent=2))

    # 4. Wait 15s then check messages
    print("\nWaiting 15s for Manus to reply...")
    await asyncio.sleep(15)

    print("\nFetching messages...")
    async with httpx.AsyncClient(timeout=30) as c:
        r = await c.get(f"{BASE}/task.listMessages", headers=HEADERS, params={"task_id": task_id})
        data = r.json()
        messages = data.get("messages", [])
        print(f"Total messages: {len(messages)}")
        for msg in messages:
            print("\n---")
            print(f"type: {msg.get('type')}")
            if msg.get("type") == "assistant_message":
                content = msg.get("assistant_message", {}).get("content", "")
                print(f"content: {content[:500]}")
            elif msg.get("type") == "status_update":
                print(f"status_update: {json.dumps(msg.get('status_update', {}))}")
            else:
                print(json.dumps(msg)[:300])


asyncio.run(main())
