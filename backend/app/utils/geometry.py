from __future__ import annotations

from math import acos, degrees
from typing import Sequence


def calculate_angle(
    a: Sequence[float],
    b: Sequence[float],
    c: Sequence[float],
) -> float:
    """Return the angle ABC in degrees."""
    ax, ay, az = (float(value) for value in a[:3])
    bx, by, bz = (float(value) for value in b[:3])
    cx, cy, cz = (float(value) for value in c[:3])

    ba = (ax - bx, ay - by, az - bz)
    bc = (cx - bx, cy - by, cz - bz)

    dot = sum(left * right for left, right in zip(ba, bc))
    mag_ba = sum(value * value for value in ba) ** 0.5
    mag_bc = sum(value * value for value in bc) ** 0.5
    if mag_ba == 0 or mag_bc == 0:
        return 0.0

    cosine = max(-1.0, min(1.0, dot / (mag_ba * mag_bc)))
    return float(degrees(acos(cosine)))


def is_wrong_joint(user_angle: float, ref_angle: float, threshold: float = 15.0) -> bool:
    """Return True when the angle difference exceeds the threshold."""
    return abs(float(user_angle) - float(ref_angle)) >= float(threshold)
