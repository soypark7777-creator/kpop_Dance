from __future__ import annotations

import hashlib
import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Mapping

from ..utils.mediapipe_helpers import landmarks_to_dict, normalize_landmarks

try:  # Optional dependency for actual landmark extraction
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

try:  # Optional dependency for actual landmark extraction
    import mediapipe as mp  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    mp = None

JOINT_NAMES = [
    "nose",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

_BASE_POSE: dict[str, dict[str, float]] = {
    "nose": {"x": 0.50, "y": 0.12, "visibility": 0.99},
    "left_shoulder": {"x": 0.38, "y": 0.28, "visibility": 0.99},
    "right_shoulder": {"x": 0.62, "y": 0.28, "visibility": 0.99},
    "left_elbow": {"x": 0.28, "y": 0.42, "visibility": 0.95},
    "right_elbow": {"x": 0.72, "y": 0.42, "visibility": 0.95},
    "left_wrist": {"x": 0.20, "y": 0.55, "visibility": 0.90},
    "right_wrist": {"x": 0.80, "y": 0.55, "visibility": 0.90},
    "left_hip": {"x": 0.41, "y": 0.54, "visibility": 0.99},
    "right_hip": {"x": 0.59, "y": 0.54, "visibility": 0.99},
    "left_knee": {"x": 0.39, "y": 0.72, "visibility": 0.97},
    "right_knee": {"x": 0.61, "y": 0.72, "visibility": 0.97},
    "left_ankle": {"x": 0.38, "y": 0.90, "visibility": 0.95},
    "right_ankle": {"x": 0.62, "y": 0.90, "visibility": 0.95},
}


def normalize_pose_pose_json(pose_json: Mapping[str, Any] | None) -> dict[str, Any]:
    if not isinstance(pose_json, Mapping):
        return {}

    normalized: dict[str, Any] = {}
    for joint in JOINT_NAMES:
        joint_value = pose_json.get(joint)
        if isinstance(joint_value, Mapping):
            normalized[joint] = {
                "x": float(joint_value.get("x", 0.0)),
                "y": float(joint_value.get("y", 0.0)),
                "z": float(joint_value.get("z", 0.0)) if joint_value.get("z") is not None else None,
                "visibility": (
                    float(joint_value.get("visibility", 0.0))
                    if joint_value.get("visibility") is not None
                    else None
                ),
            }
    return normalized


def pose_from_landmarks(landmarks: Any) -> dict[str, Any]:
    """Convert MediaPipe landmarks or any landmark-like object to plain JSON."""
    normalized = normalize_landmarks(landmarks)
    if isinstance(normalized, Mapping):
        return normalize_pose_pose_json(normalized)
    return landmarks_to_dict(normalized)


def clone_pose(pose_json: Mapping[str, Any] | None) -> dict[str, Any]:
    return deepcopy(normalize_pose_pose_json(pose_json))


def default_reference_pose() -> dict[str, Any]:
    return deepcopy(_BASE_POSE)


def load_pose_json_file(path: str | Path | None) -> dict[str, Any] | list[dict[str, Any]] | None:
    if path is None:
        return None

    file_path = Path(path)
    if not file_path.is_absolute():
        file_path = Path(__file__).resolve().parents[1] / file_path
    else:
        normalized = file_path.as_posix()
        if normalized.startswith("/storage/"):
            file_path = Path(__file__).resolve().parents[1] / normalized.lstrip("/")

    if not file_path.exists():
        return None

    try:
        payload = json.loads(file_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None

    if isinstance(payload, dict):
        if isinstance(payload.get("pose_json"), Mapping):
            return normalize_pose_pose_json(payload["pose_json"])
        if isinstance(payload.get("frames"), list):
            return payload["frames"]
        return normalize_pose_pose_json(payload)

    if isinstance(payload, list):
        return payload
    return None


def resolve_reference_pose(path: str | Path | None, frame_index: int = 0) -> dict[str, Any]:
    payload = load_pose_json_file(path)
    if isinstance(payload, list) and payload:
        item = payload[frame_index % len(payload)]
        if isinstance(item, Mapping):
            if isinstance(item.get("pose_json"), Mapping):
                return normalize_pose_pose_json(item["pose_json"])
            return normalize_pose_pose_json(item)
    if isinstance(payload, Mapping):
        return normalize_pose_pose_json(payload)
    return default_reference_pose()


def _pose_from_image_fallback(image, frame_index: int = 0) -> dict[str, Any]:
    if image is None:
        return default_reference_pose()

    height, width = image.shape[:2]
    mean_value = float(image.mean() if hasattr(image, "mean") else 128.0)
    brightness = mean_value / 255.0
    digest = hashlib.sha1(image.tobytes()).digest() if hasattr(image, "tobytes") else b"\x00" * 20
    sway = ((digest[0] / 255.0) - 0.5) * 0.06
    bounce = ((digest[1] / 255.0) - 0.5) * 0.08
    frame_wave = (frame_index % 12) / 12.0

    def point(x: float, y: float, visibility: float = 0.96) -> dict[str, float]:
        return {
            "x": round(max(0.0, min(1.0, x)), 4),
            "y": round(max(0.0, min(1.0, y)), 4),
            "visibility": round(max(0.0, min(1.0, visibility)), 4),
        }

    base = default_reference_pose()
    return {
        **base,
        "nose": point(0.50 + sway * 0.2, 0.12 + bounce * 0.15 + (0.01 * frame_wave), 0.99),
        "left_elbow": point(0.28 - sway, 0.42 - bounce * 0.5 + (0.04 * frame_wave), 0.94),
        "right_elbow": point(0.72 + sway, 0.42 + bounce * 0.5 - (0.04 * frame_wave), 0.94),
        "left_wrist": point(0.20 - sway * 1.1, 0.55 + bounce * 0.7, 0.90),
        "right_wrist": point(0.80 + sway * 1.1, 0.55 - bounce * 0.7, 0.90),
        "left_knee": point(0.39 - sway * 0.4, 0.72 + abs(bounce) * 0.3, 0.96),
        "right_knee": point(0.61 + sway * 0.4, 0.72 + abs(bounce) * 0.3, 0.96),
        "left_ankle": point(0.38 - sway * 0.35, 0.90 + abs(bounce) * 0.25, 0.95),
        "right_ankle": point(0.62 + sway * 0.35, 0.90 + abs(bounce) * 0.25, 0.95),
    }


def pose_from_image_path(image_path: str | Path, frame_index: int = 0) -> dict[str, Any]:
    path = Path(image_path)
    if not path.exists():
        return default_reference_pose()

    if cv2 is None:
        return default_reference_pose()

    image = cv2.imread(str(path))
    if image is None:
        return default_reference_pose()

    if mp is not None:
        try:
            pose = mp.solutions.pose.Pose(
                static_image_mode=True,
                model_complexity=1,
                enable_segmentation=False,
                min_detection_confidence=0.5,
            )
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            result = pose.process(rgb)
            pose.close()
            if result.pose_landmarks:
                return pose_from_landmarks(result.pose_landmarks)
        except Exception:
            pass

    return _pose_from_image_fallback(image, frame_index=frame_index)
