from __future__ import annotations

from pathlib import Path
from typing import Any

from ..models import DanceReference
from ..services.angle_service import calculate_joint_angles, compare_joint_angles
from ..services.analysis_service import build_analysis_payload
from ..services.dtw_service import similarity_score
from ..services.feedback_service import generate_feedback
from ..services.pose_service import pose_from_image_path, resolve_reference_pose
from ..services.scoring_settings import resolve_scoring_settings
from ..services.session_service import DEMO_SESSION_STORE, DemoSessionState, build_demo_frames, build_demo_report, now_iso, serialize_dance


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def _frame_score(user_pose: dict[str, Any], reference_pose: dict[str, Any], joint_errors: dict[str, dict[str, Any]]) -> tuple[float, list[float]]:
    user_angles = calculate_joint_angles(user_pose)
    reference_angles = calculate_joint_angles(reference_pose)

    shared_keys = [joint for joint in user_angles.keys() if joint in reference_angles]
    diffs = [abs(float(user_angles[joint]) - float(reference_angles[joint])) for joint in shared_keys]
    average_diff = sum(diffs) / len(diffs) if diffs else 0.0

    angle_values_user = [float(user_angles[joint]) for joint in sorted(shared_keys)]
    angle_values_reference = [float(reference_angles[joint]) for joint in sorted(shared_keys)]
    motion_similarity = (
        similarity_score(angle_values_user, angle_values_reference)
        if angle_values_user and angle_values_reference
        else 100.0
    )

    penalty = (len(joint_errors) * 4.0) + (average_diff * 1.2) + ((100.0 - motion_similarity) * 0.15)
    score = _clamp_score(100.0 - penalty)
    return score, angle_values_user or angle_values_reference


def _section_name(index: int) -> str:
    names = [
        "인트로",
        "상체 1",
        "상체 2",
        "포인트 1",
        "포인트 2",
        "하체 1",
        "하체 2",
        "아웃트로",
    ]
    return names[index] if 0 <= index < len(names) else f"구간 {index + 1}"


def _build_detailed_section_scores(
    frames: list[dict[str, Any]],
    duration_seconds: int,
    total_score: float,
) -> list[dict[str, Any]]:
    section_count = 8
    if not frames:
        step = duration_seconds / section_count if section_count else duration_seconds
        return [
            {
                "section_index": index,
                "section_name": _section_name(index),
                "start_time": round(index * step),
                "end_time": round((index + 1) * step),
                "score": round(total_score, 2),
            }
            for index in range(section_count)
        ]

    total_duration = max(duration_seconds, int(max(frame.get("timestamp_seconds", 0.0) for frame in frames)) + 1)
    section_length = max(total_duration / section_count, 1)
    sections: list[dict[str, Any]] = []

    for index in range(section_count):
        start_time = index * section_length
        end_time = (index + 1) * section_length
        section_frames = [
            frame for frame in frames if start_time <= float(frame.get("timestamp_seconds", 0.0)) < end_time
        ]
        scores = [float(frame.get("score", 0.0)) for frame in section_frames]
        section_score = round(sum(scores) / len(scores), 2) if scores else round(total_score, 2)
        sections.append(
            {
                "section_index": index,
                "section_name": _section_name(index),
                "start_time": round(start_time, 2),
                "end_time": round(end_time, 2),
                "score": section_score,
            }
        )

    return sections


def analyze_upload_frames(upload_job: dict[str, Any]) -> dict[str, Any]:
    upload_id = str(upload_job["id"])
    preview_frames = upload_job.get("preview_frames") or []
    source_duration_seconds = upload_job.get("source_duration_seconds")
    duration_seconds = int(round(float(source_duration_seconds or 0) or max(len(preview_frames), 1)))

    dance_reference_id = upload_job.get("dance_reference_id")
    dance_reference: DanceReference | None = None
    if dance_reference_id is not None:
        try:
            dance_reference = DanceReference.query.filter_by(id=int(dance_reference_id)).first()
        except (TypeError, ValueError):
            dance_reference = None

    scoring = resolve_scoring_settings(
        getattr(dance_reference, "title", None),
        getattr(dance_reference, "difficulty", None),
    )

    analyzed_frames: list[dict[str, Any]] = []
    frame_scores: list[float] = []
    frame_signature: list[float] = []
    joint_variability: dict[str, list[float]] = {}
    previous_angles: dict[str, float] | None = None
    frames_dir = Path(upload_job.get("frames_dir") or "")

    if preview_frames:
        for index, preview in enumerate(preview_frames):
            file_name = preview.get("file_name")
            if not isinstance(file_name, str):
                continue

            frame_path = frames_dir / file_name if frames_dir else None
            if frame_path is None or not frame_path.exists():
                continue

            user_pose = pose_from_image_path(frame_path, frame_index=index)
            reference_pose = resolve_reference_pose(
                getattr(dance_reference, "reference_json_path", None),
                frame_index=index,
            )
            joint_errors = compare_joint_angles(user_pose, reference_pose)
            score, signature_values = _frame_score(user_pose, reference_pose, joint_errors)
            feedback = generate_feedback(joint_errors, score)
            user_angles = calculate_joint_angles(user_pose)

            if previous_angles is not None:
                for joint_name, angle in user_angles.items():
                    previous_angle = previous_angles.get(joint_name)
                    if previous_angle is None:
                        continue
                    joint_variability.setdefault(joint_name, []).append(abs(angle - previous_angle))
            previous_angles = user_angles

            frame_scores.append(score)
            frame_signature.append(round(sum(signature_values) / len(signature_values), 2) if signature_values else score)
            analyzed_frames.append(
                {
                    "id": index + 1,
                    "session_id": upload_id,
                    "frame_index": int(preview.get("frame_index", index)),
                    "timestamp_seconds": float(preview.get("timestamp_seconds", 0.0)),
                    "pose_json": user_pose,
                    "score": score,
                    "joint_errors": joint_errors,
                    "feedback": feedback,
                }
            )

    if not analyzed_frames:
        analyzed_frames = build_demo_frames(upload_id, duration_seconds=duration_seconds, count=12)
        frame_scores = [float(frame["score"]) for frame in analyzed_frames]
        frame_signature = [float(frame["score"]) for frame in analyzed_frames]
        joint_variability = {}
        report = build_demo_report(upload_id, total_score=sum(frame_scores) / len(frame_scores) if frame_scores else 85.0)
        section_scores = _build_detailed_section_scores(analyzed_frames, duration_seconds, report["total_score"])
        report["section_scores"] = section_scores
        report["weakest_section"] = min(section_scores, key=lambda item: item["score"])
        report["report_json"]["best_section"] = max(section_scores, key=lambda item: item["score"])
        session_payload = {
            "id": upload_id,
            "user_id": upload_job["user_id"],
            "dance_reference_id": dance_reference.id if dance_reference is not None else upload_job.get("dance_reference_id"),
            "dance_reference": serialize_dance(dance_reference) if dance_reference is not None else None,
            "started_at": upload_job.get("created_at") or now_iso(),
            "ended_at": now_iso(),
            "total_score": report["total_score"],
            "lowest_section_score": min(section["score"] for section in report["section_scores"]),
            "unlock_avatar_render": report["total_score"] >= 80,
            "session_status": "completed",
            "created_at": upload_job.get("created_at") or now_iso(),
        }
        DEMO_SESSION_STORE[upload_id] = DemoSessionState(session=session_payload, frames=analyzed_frames, report=report)
        return {
            "analysis_session_id": upload_id,
            "report_url": f"/report/{upload_id}",
            "analysis_source": "demo_fallback",
            "analysis_ready": True,
            "report": report,
            "session": session_payload,
            "frames": analyzed_frames,
        }

    variability_map = {
        joint_name: round(sum(values) / len(values), 2)
        for joint_name, values in joint_variability.items()
        if values
    }
    total_score = sum(frame_scores) / len(frame_scores) if frame_scores else scoring.default_total_score
    report = build_analysis_payload(
        upload_id,
        total_score=total_score,
        duration_seconds=duration_seconds,
        frame_scores=frame_scores,
        frame_signature=frame_signature,
        joint_variability=variability_map,
        scoring=scoring,
    )
    section_scores = _build_detailed_section_scores(analyzed_frames, duration_seconds, report["total_score"])
    report["section_scores"] = section_scores
    report["weakest_section"] = min(section_scores, key=lambda item: item["score"])
    report["report_json"]["best_section"] = max(section_scores, key=lambda item: item["score"])
    session_payload = {
        "id": upload_id,
        "user_id": upload_job["user_id"],
        "dance_reference_id": dance_reference.id if dance_reference is not None else upload_job.get("dance_reference_id"),
        "dance_reference": serialize_dance(dance_reference) if dance_reference is not None else None,
        "started_at": upload_job.get("created_at") or now_iso(),
        "ended_at": now_iso(),
        "total_score": report["total_score"],
        "lowest_section_score": min(section["score"] for section in report["section_scores"]),
        "unlock_avatar_render": report["total_score"] >= 80,
        "session_status": "completed",
        "created_at": upload_job.get("created_at") or now_iso(),
    }
    DEMO_SESSION_STORE[upload_id] = DemoSessionState(session=session_payload, frames=analyzed_frames, report=report)
    return {
        "analysis_session_id": upload_id,
        "report_url": f"/report/{upload_id}",
        "analysis_source": "uploaded_frames",
        "analysis_ready": True,
        "report": report,
        "session": session_payload,
        "frames": analyzed_frames,
    }
