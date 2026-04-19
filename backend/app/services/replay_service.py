from __future__ import annotations

from typing import Any, Mapping


def sort_frames(frames: list[Mapping[str, Any]]) -> list[Mapping[str, Any]]:
    return sorted(frames, key=lambda frame: float(frame.get("timestamp_seconds", 0.0)))


def build_replay_summary(frames: list[Mapping[str, Any]]) -> dict[str, Any]:
    ordered_frames = sort_frames(frames)
    scores = [float(frame.get("score", 0.0)) for frame in ordered_frames]
    if scores:
        average_score = round(sum(scores) / len(scores), 2)
        best_score = round(max(scores), 2)
        worst_score = round(min(scores), 2)
    else:
        average_score = 0.0
        best_score = 0.0
        worst_score = 0.0

    return {
        "frame_count": len(ordered_frames),
        "average_score": average_score,
        "best_score": best_score,
        "worst_score": worst_score,
    }


def replay_frame_payload(frame: Mapping[str, Any]) -> dict[str, Any]:
    return {
        "frame_index": int(frame.get("frame_index", 0)),
        "timestamp_seconds": float(frame.get("timestamp_seconds", 0.0)),
        "pose_json": frame.get("pose_json", {}),
        "score": float(frame.get("score", 0.0)),
    }
