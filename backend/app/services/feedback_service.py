from __future__ import annotations

from typing import Any, Mapping


def generate_feedback(joint_errors: Mapping[str, Mapping[str, Any]], match_score: float) -> dict[str, Any]:
    if match_score >= 92:
        level = "perfect"
        text = "동작이 아주 좋습니다."
        target_joint = None
    elif match_score >= 80:
        level = "good"
        text = "전체적으로 안정적입니다. 조금만 더 정리하면 좋습니다."
        target_joint = None
    else:
        level = "needs_fix"
        target_joint = next(iter(joint_errors.keys()), None)
        if target_joint == "right_knee":
            text = "무릎 각도를 조금 더 부드럽게 맞춰보세요."
        elif target_joint == "left_elbow":
            text = "왼쪽 팔꿈치가 조금 더 자연스럽게 움직이면 좋습니다."
        else:
            text = "동작과 리듬을 조금 더 맞춰보세요."

    payload = {
        "level": level,
        "text": text,
        "timestamp": 0,
    }
    if target_joint is not None:
        payload["target_joint"] = target_joint
    return payload


def summarize_feedback(joint_errors: Mapping[str, Mapping[str, Any]], match_score: float) -> str:
    feedback = generate_feedback(joint_errors, match_score)
    return str(feedback["text"])
