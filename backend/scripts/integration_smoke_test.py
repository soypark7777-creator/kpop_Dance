from __future__ import annotations

import json
import urllib.request


BASE_URL = "http://127.0.0.1:5000"


def get_json(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE_URL}{path}", timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(path: str, payload: dict) -> dict:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def read_sse_events(stream_url: str, count: int = 3) -> list[dict]:
    events: list[dict] = []
    with urllib.request.urlopen(stream_url, timeout=10) as response:
        for raw_line in response:
            line = raw_line.decode("utf-8").strip()
            if not line.startswith("data: "):
                continue
            events.append(json.loads(line[6:]))
            if len(events) >= count:
                break
    return events


def main() -> None:
    references = get_json("/api/dance-references")
    dance_reference_id = references["data"][0]["id"]
    started = post_json(
        "/api/session/start",
        {"dance_reference_id": dance_reference_id, "user_id": 1},
    )
    session_id = started["data"]["session_id"]
    events = read_sse_events(started["data"]["stream_url"])
    ended = post_json("/api/session/end", {"session_id": session_id})
    analysis = get_json(f"/api/analysis/{session_id}")
    frames = get_json(f"/api/session/{session_id}/frames")

    summary = {
        "references": len(references["data"]),
        "session_id": session_id,
        "sse_events": len(events),
        "sse_session_id_ok": events[0]["session_id"] == session_id,
        "sse_snake_case_ok": "match_score" in events[0] and "is_recording" in events[0],
        "unlock_avatar_render": ended["data"]["unlock_avatar_render"],
        "total_score": analysis["data"]["total_score"],
        "frames": len(frames["data"]),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
