from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from ..extensions import db
from ..models import AnalysisReport, PracticeSession, SessionFrame
from .angle_service import calculate_joint_angles
from .dtw_service import similarity_score
from .scoring_settings import ScoringSettings, get_scoring_settings, resolve_scoring_settings
from .session_service import serialize_report as serialize_analysis_record

SECTION_NAMES = ["인트로", "1절", "후렴 1", "2절", "후렴 2", "아웃트로"]
SECTION_BREAKPOINTS = [0.0, 0.107, 0.321, 0.508, 0.723, 0.909, 1.0]
SCORING = get_scoring_settings()


def _clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, value)), 2)


def _frame_scores(frames: list[SessionFrame]) -> list[float]:
    return [float(frame.score) for frame in frames if frame.score is not None]


def _frame_motion_signature(frames: list[SessionFrame]) -> list[float]:
    signature: list[float] = []
    for frame in frames:
        pose_json = frame.pose_json if isinstance(frame.pose_json, dict) else {}
        angles = calculate_joint_angles(pose_json)
        if angles:
            signature.append(round(sum(angles.values()) / len(angles), 2))
        elif frame.score is not None:
            signature.append(float(frame.score))
    return signature


def _smooth_sequence(values: list[float]) -> list[float]:
    if len(values) < 3:
        return list(values)

    smoothed: list[float] = []
    for index, _ in enumerate(values):
        start = max(0, index - 1)
        end = min(len(values), index + 2)
        window = values[start:end]
        smoothed.append(round(sum(window) / len(window), 2))
    return smoothed


def _joint_variability(frames: list[SessionFrame]) -> dict[str, float]:
    per_joint: dict[str, list[float]] = {}
    previous_angles: dict[str, float] | None = None

    for frame in frames:
        pose_json = frame.pose_json if isinstance(frame.pose_json, dict) else {}
        angles = calculate_joint_angles(pose_json)
        if not angles:
            continue
        if previous_angles is not None:
            for joint_name, angle in angles.items():
                previous_angle = previous_angles.get(joint_name)
                if previous_angle is None:
                    continue
                per_joint.setdefault(joint_name, []).append(abs(angle - previous_angle))
        previous_angles = angles

    return {
        joint_name: round(sum(diffs) / len(diffs), 2)
        for joint_name, diffs in per_joint.items()
        if diffs
    }


def _top_unstable_joints(joint_variability: dict[str, float], limit: int = 3) -> list[str]:
    ordered = sorted(joint_variability.items(), key=lambda item: item[1], reverse=True)
    return [joint_name for joint_name, _ in ordered[:limit]]


def build_section_scores(
    total_score: float,
    duration_seconds: int,
    motion_similarity: float = 100.0,
    scoring: ScoringSettings | None = None,
) -> list[dict[str, Any]]:
    scoring = scoring or SCORING
    stability_bias = (motion_similarity - scoring.section_stability_target) / scoring.section_stability_divisor
    base_scores = [
        _clamp_score(total_score + 3 + stability_bias),
        _clamp_score(total_score - 1 + (stability_bias * 0.4)),
        _clamp_score(total_score + 6 + stability_bias),
        _clamp_score(
            total_score
            - scoring.section_weak_penalty
            - max(0.0, scoring.section_stability_target - motion_similarity)
            / scoring.section_weak_similarity_divisor
        ),
        _clamp_score(total_score + 1 + (stability_bias * 0.25)),
        _clamp_score(total_score + 4 + (stability_bias * 0.5)),
    ]

    section_scores: list[dict[str, Any]] = []
    for index, score in enumerate(base_scores):
        start_ratio = SECTION_BREAKPOINTS[index]
        end_ratio = SECTION_BREAKPOINTS[index + 1]
        section_scores.append(
            {
                "section_index": index,
                "section_name": SECTION_NAMES[index],
                "start_time": round(duration_seconds * start_ratio),
                "end_time": round(duration_seconds * end_ratio),
                "score": score,
            }
        )
    return section_scores


def build_analysis_payload(
    session_id: str,
    total_score: float,
    duration_seconds: int,
    frame_scores: list[float] | None = None,
    frame_signature: list[float] | None = None,
    joint_variability: dict[str, float] | None = None,
    scoring: ScoringSettings | None = None,
) -> dict[str, Any]:
    scoring = scoring or SCORING
    frame_scores = frame_scores or []
    frame_signature = frame_signature or []
    joint_variability = joint_variability or {}

    smoothed_signature = _smooth_sequence(frame_signature)
    motion_similarity = (
        similarity_score(frame_signature, smoothed_signature)
        if len(frame_signature) > 1
        else 100.0
    )

    section_scores = build_section_scores(
        total_score,
        duration_seconds,
        motion_similarity=motion_similarity,
        scoring=scoring,
    )
    weakest_section = min(section_scores, key=lambda item: item["score"])
    best_section = max(section_scores, key=lambda item: item["score"])

    if frame_scores:
        score_spread = max(frame_scores) - min(frame_scores)
        average_score = sum(frame_scores) / len(frame_scores)
    else:
        score_spread = max(0.0, 100.0 - total_score)
        average_score = total_score

    average_joint_error = sum(joint_variability.values()) / len(joint_variability) if joint_variability else 0.0
    average_angle_error = round(
        max(
            SCORING.minimum_average_error,
            min(
                SCORING.maximum_average_error,
                (score_spread * SCORING.error_spread_weight)
                + (average_joint_error * SCORING.error_joint_weight)
                + (100.0 - motion_similarity) * SCORING.error_similarity_weight,
            ),
        ),
        3,
    )

    unstable_joints = _top_unstable_joints(joint_variability)

    if total_score >= 90 and motion_similarity >= 88:
        coach_comment = "전체적으로 완성도가 높고 동작 흐름도 안정적입니다."
        improvement_tips = [
            "후렴에서 손끝 라인만 조금 더 정리하면 완성도가 더 올라갑니다.",
            "상체 라인을 유지한 상태로 발 리듬을 계속 이어가보세요.",
        ]
    elif total_score >= 80:
        coach_comment = "점수는 좋지만 동작의 안정감을 조금 더 높이면 더 좋아집니다."
        improvement_tips = [
            "2절 진입부에서 팔 각도를 조금 더 안정적으로 유지해보세요.",
            "하체 리듬이 흔들리는 구간은 박자에 맞춰 한 박자 더 크게 써보세요.",
        ]
    else:
        coach_comment = "동작은 잘 따라오고 있습니다. 다만 일부 관절의 타이밍을 더 맞추면 좋습니다."
        improvement_tips = [
            "왼쪽 팔의 움직임을 조금 더 크게 가져가보세요.",
            "후렴에서 무릎 각도를 맞추고 중심을 낮게 유지해보세요.",
            "전환 구간에서는 박자를 한 번 더 세어보면 안정적입니다.",
        ]

    if unstable_joints:
        improvement_tips.insert(0, f"가장 흔들린 관절은 {', '.join(unstable_joints[:3])}입니다.")

    return {
        "id": 1,
        "session_id": session_id,
        "total_score": round(total_score, 2),
        "weakest_section": weakest_section,
        "most_wrong_joints": unstable_joints or ["left_elbow", "right_knee", "left_wrist"],
        "average_angle_error": average_angle_error,
        "motion_similarity": round(motion_similarity, 2),
        "section_scores": section_scores,
        "report_json": {
            "coach_comment": coach_comment,
            "improvement_tips": improvement_tips,
            "best_section": best_section,
            "motion_similarity": round(motion_similarity, 2),
            "average_score": round(average_score, 2),
            "scoring_profile_name": scoring.profile_name,
            "scoring_profile_description": scoring.profile_description,
        },
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def _derive_total_score(
    session: PracticeSession,
    frames: list[SessionFrame],
    scoring: ScoringSettings | None = None,
) -> float:
    scoring = scoring or SCORING
    if session.total_score is not None:
        return float(session.total_score)

    frame_scores = _frame_scores(frames)
    if not frame_scores:
        return scoring.default_total_score

    frame_signature = _frame_motion_signature(frames)
    smoothed_signature = _smooth_sequence(frame_signature)
    motion_similarity = similarity_score(frame_signature, smoothed_signature) if len(frame_signature) > 1 else 100.0
    average_score = sum(frame_scores) / len(frame_scores)
    total_score = (
        (average_score * scoring.average_score_weight)
        + (motion_similarity * scoring.motion_similarity_weight)
        + ((100.0 - abs(50.0 - average_score)) * scoring.balance_weight)
    )
    return round(_clamp_score(total_score), 2)


def upsert_analysis_report(session: PracticeSession, frames: list[SessionFrame]) -> AnalysisReport:
    dance_reference = getattr(session, "dance_reference", None)
    scoring = resolve_scoring_settings(
        getattr(dance_reference, "title", None),
        getattr(dance_reference, "difficulty", None),
    )
    total_score = _derive_total_score(session, frames, scoring=scoring)
    duration_seconds = 187
    if dance_reference is not None and getattr(dance_reference, "duration_seconds", None):
        duration_seconds = int(dance_reference.duration_seconds)

    frame_scores = _frame_scores(frames)
    frame_signature = _frame_motion_signature(frames)
    joint_variability = _joint_variability(frames)

    payload = build_analysis_payload(
        str(session.id),
        total_score=total_score,
        duration_seconds=duration_seconds,
        frame_scores=frame_scores,
        frame_signature=frame_signature,
        joint_variability=joint_variability,
        scoring=scoring,
    )

    weakest = payload["weakest_section"]
    report = AnalysisReport.query.filter_by(session_id=session.id).first()
    if report is None:
        report = AnalysisReport(
            session_id=session.id,
            weakest_section=weakest["section_name"],
            most_wrong_joints=payload["most_wrong_joints"],
            average_angle_error=payload["average_angle_error"],
            report_json=payload,
        )
        db.session.add(report)
    else:
        report.weakest_section = weakest["section_name"]
        report.most_wrong_joints = payload["most_wrong_joints"]
        report.average_angle_error = payload["average_angle_error"]
        report.report_json = payload

    session.total_score = payload["total_score"]
    session.lowest_section_score = min(section["score"] for section in payload["section_scores"])
    session.unlock_avatar_render = session.total_score >= 80
    return report


def serialize_analysis_report(report: AnalysisReport | dict[str, Any]) -> dict[str, Any]:
    if isinstance(report, dict):
        return report
    return serialize_analysis_record(report)
