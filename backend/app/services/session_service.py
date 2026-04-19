from __future__ import annotations

from dataclasses import dataclass, field
import math
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func

from ..extensions import db
from ..models import AnalysisReport, DanceReference, PracticeSession, SessionFrame, User
from .angle_service import compare_joint_angles
from .dtw_service import similarity_score
from .feedback_service import generate_feedback


@dataclass
class DemoSessionState:
    session: dict[str, Any]
    frames: list[dict[str, Any]] = field(default_factory=list)
    report: dict[str, Any] | None = None


DEMO_SESSION_STORE: dict[str, DemoSessionState] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_session_id(session_id: str) -> int | None:
    try:
        return int(session_id)
    except (TypeError, ValueError):
        return None


def isoformat(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    return str(value)


def rank_from_points(points: int) -> str:
    if points >= 5000:
        return "legend"
    if points >= 3000:
        return "star"
    if points >= 1500:
        return "performer"
    if points >= 500:
        return "dancer"
    return "rookie"


def session_status_to_front(status: str) -> str:
    return {
        "active": "in_progress",
        "completed": "completed",
        "abandoned": "aborted",
    }.get(status, status)


def pick_default_user() -> User | None:
    return User.query.order_by(User.id.asc()).first()


def pick_default_dance() -> DanceReference | None:
    return DanceReference.query.order_by(DanceReference.id.asc()).first()


def serialize_dance(dance: DanceReference) -> dict[str, Any]:
    return {
        "id": dance.id,
        "title": dance.title,
        "artist_name": dance.artist_name,
        "difficulty": dance.difficulty,
        "duration_seconds": dance.duration_seconds,
        "thumbnail_url": dance.thumbnail_url,
        "preview_video_url": dance.preview_video_url,
        "reference_json_path": dance.reference_json_path,
        "created_at": isoformat(dance.created_at),
    }


def serialize_user(user: User) -> dict[str, Any]:
    points = int(user.points or 0)
    streak_days = (
        db.session.query(func.date(PracticeSession.started_at))
        .filter(PracticeSession.user_id == user.id)
        .filter(PracticeSession.session_status == "completed")
        .distinct()
        .count()
    )
    return {
        "id": user.id,
        "email": user.email,
        "nickname": user.nickname,
        "avatar_id": user.avatar_id,
        "points": points,
        "status": user.status,
        "rank": rank_from_points(points),
        "streak_days": int(streak_days or 0),
        "created_at": isoformat(user.created_at),
    }


def serialize_session(session: PracticeSession) -> dict[str, Any]:
    dance = getattr(session, "dance_reference", None)
    return {
        "id": session.id,
        "user_id": session.user_id,
        "dance_reference_id": session.dance_reference_id,
        "dance_reference": serialize_dance(dance) if dance else None,
        "started_at": isoformat(session.started_at),
        "ended_at": isoformat(session.ended_at),
        "total_score": float(session.total_score) if session.total_score is not None else None,
        "lowest_section_score": float(session.lowest_section_score)
        if session.lowest_section_score is not None
        else None,
        "unlock_avatar_render": bool(session.unlock_avatar_render),
        "session_status": session_status_to_front(session.session_status),
        "created_at": isoformat(session.created_at),
    }


def serialize_session_frame(frame: SessionFrame) -> dict[str, Any]:
    return {
        "id": frame.id,
        "session_id": str(frame.session_id),
        "frame_index": frame.frame_index,
        "timestamp_seconds": float(frame.timestamp_seconds),
        "pose_json": frame.pose_json or {},
        "score": float(frame.score) if frame.score is not None else 0,
    }


def make_demo_pose(frame_index: int) -> dict[str, Any]:
    t = frame_index / 30.0
    wobble = 0.02 * ((frame_index % 3) - 1)
    return {
        "nose": {"x": 0.5, "y": 0.12 + wobble, "visibility": 0.99},
        "left_shoulder": {"x": 0.38, "y": 0.28, "visibility": 0.99},
        "right_shoulder": {"x": 0.62, "y": 0.28, "visibility": 0.99},
        "left_elbow": {"x": 0.28, "y": 0.42 + 0.03 * (t % 1), "visibility": 0.95},
        "right_elbow": {"x": 0.72, "y": 0.42 + 0.03 * (t % 1), "visibility": 0.95},
        "left_wrist": {"x": 0.20, "y": 0.55 + wobble, "visibility": 0.90},
        "right_wrist": {"x": 0.80, "y": 0.55 - wobble, "visibility": 0.90},
        "left_hip": {"x": 0.41, "y": 0.54, "visibility": 0.99},
        "right_hip": {"x": 0.59, "y": 0.54, "visibility": 0.99},
        "left_knee": {"x": 0.39, "y": 0.72, "visibility": 0.97},
        "right_knee": {"x": 0.61, "y": 0.72, "visibility": 0.97},
        "left_ankle": {"x": 0.38, "y": 0.90, "visibility": 0.95},
        "right_ankle": {"x": 0.62, "y": 0.90, "visibility": 0.95},
    }


def build_demo_frames(session_id: str, duration_seconds: int = 187, count: int = 30) -> list[dict[str, Any]]:
    frames: list[dict[str, Any]] = []
    for index in range(count):
        frames.append(
            {
                "id": index + 1,
                "session_id": session_id,
                "frame_index": index,
                "timestamp_seconds": round((duration_seconds / max(count - 1, 1)) * index, 3),
                "pose_json": make_demo_pose(index),
                "score": round(70 + (index % 6) * 3.2, 2),
            }
        )
    return frames


def build_demo_report(session_id: str, total_score: float = 85.0) -> dict[str, Any]:
    section_scores = [
        {"section_index": 0, "section_name": "인트로", "start_time": 0, "end_time": 20, "score": 88},
        {"section_index": 1, "section_name": "1절", "start_time": 20, "end_time": 60, "score": 82},
        {"section_index": 2, "section_name": "후렴 1", "start_time": 60, "end_time": 95, "score": 91},
        {"section_index": 3, "section_name": "2절", "start_time": 95, "end_time": 135, "score": 71},
        {"section_index": 4, "section_name": "후렴 2", "start_time": 135, "end_time": 170, "score": 85},
        {"section_index": 5, "section_name": "아웃트로", "start_time": 170, "end_time": 187, "score": 89},
    ]
    weakest_section = min(section_scores, key=lambda item: item["score"])
    best_section = max(section_scores, key=lambda item: item["score"])
    return {
        "id": 1,
        "session_id": session_id,
        "total_score": round(total_score, 2),
        "weakest_section": weakest_section,
        "most_wrong_joints": ["left_elbow", "right_knee", "left_wrist"],
        "average_angle_error": 12.4,
        "section_scores": section_scores,
        "report_json": {
            "coach_comment": "전반적으로 좋지만 2절의 왼쪽 팔 동작을 조금 더 안정적으로 유지하면 더 좋아집니다.",
            "improvement_tips": [
                "왼쪽 팔 각도를 조금 더 높게 유지해보세요.",
                "후렴 구간에서 하체 리듬을 더 크게 써보세요.",
                "2절 진입부에서 동작 전환을 한 박자 더 정확히 맞춰보세요.",
            ],
            "best_section": best_section,
        },
        "created_at": now_iso(),
    }


def create_demo_session(dance_reference_id: int) -> dict[str, Any]:
    demo_dances = {
        1: {
            "id": 1,
            "title": "Pink Venom",
            "artist_name": "BLACKPINK",
            "difficulty": "hard",
            "duration_seconds": 187,
            "thumbnail_url": "/mock/thumbs/pink-venom.jpg",
            "preview_video_url": "/mock/videos/pink-venom-preview.mp4",
            "reference_json_path": "/storage/dance_reference/pink-venom.json",
            "created_at": "2024-10-01T00:00:00Z",
        },
        2: {
            "id": 2,
            "title": "Hype Boy",
            "artist_name": "NewJeans",
            "difficulty": "normal",
            "duration_seconds": 185,
            "thumbnail_url": "/mock/thumbs/hype-boy.jpg",
            "preview_video_url": "/mock/videos/hype-boy-preview.mp4",
            "reference_json_path": "/storage/dance_reference/hype-boy.json",
            "created_at": "2024-10-05T00:00:00Z",
        },
        3: {
            "id": 3,
            "title": "Spicy",
            "artist_name": "aespa",
            "difficulty": "expert",
            "duration_seconds": 196,
            "thumbnail_url": "/mock/thumbs/spicy.jpg",
            "preview_video_url": None,
            "reference_json_path": "/storage/dance_reference/spicy.json",
            "created_at": "2024-10-10T00:00:00Z",
        },
        4: {
            "id": 4,
            "title": "I AM",
            "artist_name": "IVE",
            "difficulty": "normal",
            "duration_seconds": 212,
            "thumbnail_url": "/mock/thumbs/i-am.jpg",
            "preview_video_url": None,
            "reference_json_path": "/storage/dance_reference/i-am.json",
            "created_at": "2024-10-15T00:00:00Z",
        },
        5: {
            "id": 5,
            "title": "Dynamite",
            "artist_name": "BTS",
            "difficulty": "easy",
            "duration_seconds": 199,
            "thumbnail_url": "/mock/thumbs/dynamite.jpg",
            "preview_video_url": None,
            "reference_json_path": "/storage/dance_reference/dynamite.json",
            "created_at": "2024-10-20T00:00:00Z",
        },
    }
    dance = demo_dances.get(dance_reference_id)
    if dance is None:
        dance = {
            "id": dance_reference_id,
            "title": "Demo Dance",
            "artist_name": "Demo Artist",
            "difficulty": "normal",
            "duration_seconds": 187,
            "thumbnail_url": "/mock/thumbs/demo.jpg",
            "preview_video_url": None,
            "reference_json_path": "/storage/dance_reference/demo.json",
            "created_at": now_iso(),
        }

    session_id = f"mock_session_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    session = {
        "id": session_id,
        "user_id": 1,
        "dance_reference_id": dance["id"],
        "dance_reference": dance,
        "started_at": now_iso(),
        "ended_at": None,
        "total_score": None,
        "lowest_section_score": None,
        "unlock_avatar_render": False,
        "session_status": "in_progress",
        "created_at": now_iso(),
    }
    DEMO_SESSION_STORE[session_id] = DemoSessionState(
        session=session,
        frames=build_demo_frames(session_id, duration_seconds=dance["duration_seconds"]),
        report=None,
    )
    return session


def get_demo_state(session_id: str) -> DemoSessionState | None:
    return DEMO_SESSION_STORE.get(session_id)


def finalize_demo_session(session_id: str) -> DemoSessionState | None:
    state = DEMO_SESSION_STORE.get(session_id)
    if state is None:
        return None
    total_score = 85.0
    if state.frames:
        total_score = sum(float(frame["score"]) for frame in state.frames) / len(state.frames)
    state.session["ended_at"] = now_iso()
    state.session["total_score"] = round(total_score, 2)
    state.session["lowest_section_score"] = 71.0
    state.session["unlock_avatar_render"] = state.session["total_score"] >= 80
    state.session["session_status"] = "completed"
    state.report = build_demo_report(session_id, total_score=state.session["total_score"])
    return state


def serialize_report(report: AnalysisReport | dict[str, Any]) -> dict[str, Any]:
    if isinstance(report, dict):
        return report

    report_json = report.report_json or {}
    return {
        "id": report.id,
        "session_id": str(report.session_id),
        "total_score": report_json.get("total_score", 0),
        "weakest_section": report_json.get(
            "weakest_section",
            {
                "section_index": 0,
                "section_name": report.weakest_section or "",
                "start_time": 0,
                "end_time": 0,
                "score": 0,
            },
        ),
        "most_wrong_joints": report_json.get("most_wrong_joints", report.most_wrong_joints or []),
        "average_angle_error": float(report.average_angle_error) if report.average_angle_error is not None else 0,
        "section_scores": report_json.get("section_scores", []),
        "report_json": report_json,
        "created_at": isoformat(report.created_at),
    }


def _base_joint_names() -> list[str]:
    return [
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


def build_base_pose(frame_index: int, phase: float = 0.0, noise_scale: float = 0.0) -> dict[str, Any]:
    wobble = math.sin((frame_index / 10.0) + phase) * 0.018
    lean = math.cos((frame_index / 18.0) + phase) * 0.012

    def point(x: float, y: float, visibility: float = 0.98) -> dict[str, float]:
        return {
            "x": round(x, 4),
            "y": round(y, 4),
            "visibility": round(max(min(visibility, 1.0), 0.0), 4),
        }

    return {
        "nose": point(0.50 + lean, 0.12 + wobble, 0.99),
        "left_shoulder": point(0.38, 0.28, 0.99),
        "right_shoulder": point(0.62, 0.28, 0.99),
        "left_elbow": point(0.28 - noise_scale, 0.42 - wobble, 0.95),
        "right_elbow": point(0.72 + noise_scale, 0.42 + wobble, 0.95),
        "left_wrist": point(0.20 - noise_scale, 0.55 + wobble, 0.90),
        "right_wrist": point(0.80 + noise_scale, 0.55 - wobble, 0.90),
        "left_hip": point(0.41, 0.54, 0.99),
        "right_hip": point(0.59, 0.54, 0.99),
        "left_knee": point(0.39 - noise_scale, 0.72, 0.97),
        "right_knee": point(0.61 + noise_scale, 0.72, 0.97),
        "left_ankle": point(0.38 - noise_scale, 0.90, 0.95),
        "right_ankle": point(0.62 + noise_scale, 0.90, 0.95),
    }


def build_joint_errors(frame_index: int, match_score: int) -> dict[str, Any]:
    if match_score >= 90:
        return {}

    errors: dict[str, Any] = {}
    if frame_index % 2 == 0:
        errors["left_elbow"] = {
            "joint": "left_elbow",
            "status": "wrong",
            "angle_diff": round(16.0 + (frame_index % 5) * 1.5, 2),
            "direction": "위로",
        }
    if frame_index % 3 == 0:
        errors["right_knee"] = {
            "joint": "right_knee",
            "status": "wrong",
            "angle_diff": round(14.5 + (frame_index % 4) * 1.2, 2),
            "direction": "아래로",
        }
    if frame_index % 5 == 0:
        errors["left_wrist"] = {
            "joint": "left_wrist",
            "status": "wrong",
            "angle_diff": round(12.0 + (frame_index % 3) * 1.1, 2),
            "direction": "왼쪽으로",
        }
    return errors


def build_feedback(frame_index: int, match_score: int, joint_errors: dict[str, Any]) -> dict[str, Any]:
    payload = generate_feedback(joint_errors, match_score)
    payload["timestamp"] = int(datetime.now(timezone.utc).timestamp() * 1000)
    return payload


def build_live_frame_payload(
    session_identifier: str,
    frame_index: int,
    reference_pose: dict[str, Any] | None = None,
) -> dict[str, Any]:
    reference_pose = reference_pose or build_base_pose(frame_index, phase=0.0, noise_scale=0.0)
    noise_scale = 0.008 + (frame_index % 4) * 0.002
    user_pose = build_base_pose(frame_index, phase=0.6, noise_scale=noise_scale)

    joint_errors = compare_joint_angles(user_pose, reference_pose, threshold=15.0)
    angle_diffs = [float(item["angle_diff"]) for item in joint_errors.values() if item.get("angle_diff") is not None]
    similarity = similarity_score(
        [float(frame_index % 100), float(len(joint_errors)), float(max(angle_diffs) if angle_diffs else 0.0)],
        [0.0, 1.0, 2.0],
    )
    penalty = min(20.0, len(joint_errors) * 4.0 + (sum(angle_diffs) / max(len(angle_diffs), 1)) * 0.6)
    match_score = max(55.0, min(99.0, round(similarity - penalty + 22.0, 0)))
    return {
        "session_id": session_identifier,
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        "user_pose": user_pose,
        "reference_pose": reference_pose,
        "joint_errors": joint_errors,
        "feedback": build_feedback(frame_index, int(match_score), joint_errors),
        "match_score": match_score,
        "is_recording": True,
        "section_index": frame_index // 5,
    }


def get_stream_reference_pose(session_id: str, frame_index: int) -> dict[str, Any]:
    demo_state = DEMO_SESSION_STORE.get(session_id)
    if demo_state and demo_state.frames:
        frame = demo_state.frames[frame_index % len(demo_state.frames)]
        pose = frame.get("pose_json")
        if isinstance(pose, dict):
            return pose

    parsed_session_id = parse_session_id(session_id)
    if parsed_session_id is not None:
        frame = (
            SessionFrame.query.filter_by(session_id=parsed_session_id)
            .order_by(SessionFrame.frame_index.asc())
            .offset(frame_index)
            .first()
        )
        if frame and isinstance(frame.pose_json, dict):
            return frame.pose_json

    return build_base_pose(frame_index, phase=0.0, noise_scale=0.0)
