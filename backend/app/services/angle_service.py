from __future__ import annotations

from typing import Any, Mapping

from ..utils.geometry import calculate_angle, is_wrong_joint


ANGLE_TRIPLETS: dict[str, tuple[str, str, str]] = {
    "left_elbow": ("left_shoulder", "left_elbow", "left_wrist"),
    "right_elbow": ("right_shoulder", "right_elbow", "right_wrist"),
    "left_shoulder": ("left_elbow", "left_shoulder", "left_hip"),
    "right_shoulder": ("right_elbow", "right_shoulder", "right_hip"),
    "left_hip": ("left_shoulder", "left_hip", "left_knee"),
    "right_hip": ("right_shoulder", "right_hip", "right_knee"),
    "left_knee": ("left_hip", "left_knee", "left_ankle"),
    "right_knee": ("right_hip", "right_knee", "right_ankle"),
}


def _point(pose: Mapping[str, Any], joint: str) -> tuple[float, float, float] | None:
    joint_value = pose.get(joint)
    if not isinstance(joint_value, Mapping):
        return None
    return (
        float(joint_value.get("x", 0.0)),
        float(joint_value.get("y", 0.0)),
        float(joint_value.get("z", 0.0) or 0.0),
    )


def calculate_joint_angles(pose: Mapping[str, Any]) -> dict[str, float]:
    angles: dict[str, float] = {}
    for joint_name, (a_joint, b_joint, c_joint) in ANGLE_TRIPLETS.items():
        a = _point(pose, a_joint)
        b = _point(pose, b_joint)
        c = _point(pose, c_joint)
        if a is None or b is None or c is None:
            continue
        angles[joint_name] = round(calculate_angle(a, b, c), 2)
    return angles


def compare_joint_angles(
    user_pose: Mapping[str, Any],
    reference_pose: Mapping[str, Any],
    threshold: float = 15.0,
) -> dict[str, dict[str, Any]]:
    user_angles = calculate_joint_angles(user_pose)
    reference_angles = calculate_joint_angles(reference_pose)
    errors: dict[str, dict[str, Any]] = {}

    for joint_name, user_angle in user_angles.items():
        ref_angle = reference_angles.get(joint_name)
        if ref_angle is None:
            continue
        diff = round(abs(user_angle - ref_angle), 2)
        if is_wrong_joint(user_angle, ref_angle, threshold):
            direction = "right" if user_angle > ref_angle else "left"
            errors[joint_name] = {
                "joint": joint_name,
                "status": "wrong",
                "angle_diff": diff,
                "direction": direction,
                "user_angle": user_angle,
                "reference_angle": ref_angle,
            }

    return errors
