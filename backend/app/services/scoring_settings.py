from __future__ import annotations

import os
from dataclasses import dataclass, replace
from functools import lru_cache
from typing import Any


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value in (None, ""):
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _normalize_key(value: str | None) -> str:
    if not value:
        return ""
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in value).strip("_")


@dataclass(frozen=True)
class ScoringSettings:
    profile_name: str = "default"
    profile_description: str = "기본 균형형 가중치"
    average_score_weight: float = 0.72
    motion_similarity_weight: float = 0.18
    balance_weight: float = 0.10
    section_stability_target: float = 80.0
    section_stability_divisor: float = 12.0
    section_weak_penalty: float = 14.0
    section_weak_similarity_divisor: float = 5.0
    error_spread_weight: float = 0.35
    error_joint_weight: float = 0.55
    error_similarity_weight: float = 0.08
    minimum_average_error: float = 4.2
    maximum_average_error: float = 22.5
    default_total_score: float = 85.0


def _base_settings() -> ScoringSettings:
    return ScoringSettings(
        average_score_weight=_env_float("SCORING_AVERAGE_SCORE_WEIGHT", 0.72),
        motion_similarity_weight=_env_float("SCORING_MOTION_SIMILARITY_WEIGHT", 0.18),
        balance_weight=_env_float("SCORING_BALANCE_WEIGHT", 0.10),
        section_stability_target=_env_float("SCORING_SECTION_STABILITY_TARGET", 80.0),
        section_stability_divisor=_env_float("SCORING_SECTION_STABILITY_DIVISOR", 12.0),
        section_weak_penalty=_env_float("SCORING_SECTION_WEAK_PENALTY", 14.0),
        section_weak_similarity_divisor=_env_float("SCORING_SECTION_WEAK_SIMILARITY_DIVISOR", 5.0),
        error_spread_weight=_env_float("SCORING_ERROR_SPREAD_WEIGHT", 0.35),
        error_joint_weight=_env_float("SCORING_ERROR_JOINT_WEIGHT", 0.55),
        error_similarity_weight=_env_float("SCORING_ERROR_SIMILARITY_WEIGHT", 0.08),
        minimum_average_error=_env_float("SCORING_MIN_AVERAGE_ERROR", 4.2),
        maximum_average_error=_env_float("SCORING_MAX_AVERAGE_ERROR", 22.5),
        default_total_score=_env_float("SCORING_DEFAULT_TOTAL_SCORE", 85.0),
    )


PROFILE_OVERRIDES: dict[str, dict[str, Any]] = {
    "default": {},
    "balanced": {
        "profile_description": "균형형 기준으로 평균 점수와 동작 유사도를 고르게 봅니다.",
    },
    "high_energy": {
        "profile_description": "강한 동작과 빠른 전환을 더 넓게 허용하는 고강도 곡용 가중치입니다.",
        "average_score_weight": 0.66,
        "motion_similarity_weight": 0.24,
        "balance_weight": 0.10,
        "section_stability_target": 82.0,
        "section_weak_penalty": 15.0,
        "error_spread_weight": 0.32,
        "error_joint_weight": 0.58,
        "error_similarity_weight": 0.10,
    },
    "precision": {
        "profile_description": "미세한 각도 오차를 더 엄격하게 보는 정밀 교정용 가중치입니다.",
        "average_score_weight": 0.68,
        "motion_similarity_weight": 0.16,
        "balance_weight": 0.16,
        "section_stability_target": 78.0,
        "section_stability_divisor": 10.0,
        "section_weak_penalty": 16.0,
        "section_weak_similarity_divisor": 4.5,
        "error_spread_weight": 0.38,
        "error_joint_weight": 0.52,
        "error_similarity_weight": 0.10,
    },
    "training": {
        "profile_description": "초보자 연습용으로 점수 변동을 조금 완만하게 보는 가중치입니다.",
        "average_score_weight": 0.76,
        "motion_similarity_weight": 0.14,
        "balance_weight": 0.10,
        "section_stability_target": 76.0,
        "section_weak_penalty": 12.0,
        "error_spread_weight": 0.30,
        "error_joint_weight": 0.52,
        "error_similarity_weight": 0.06,
    },
}

TITLE_PROFILE_MAP: dict[str, str] = {
    "pink_venom": "high_energy",
    "spicy": "high_energy",
    "hype_boy": "balanced",
    "attention": "balanced",
    "super_shy": "training",
    "i_am": "training",
    "dynamite": "balanced",
}

DIFFICULTY_PROFILE_MAP: dict[str, str] = {
    "easy": "training",
    "normal": "balanced",
    "hard": "high_energy",
    "expert": "precision",
}


def _apply_overrides(base: ScoringSettings, profile_name: str) -> ScoringSettings:
    overrides = PROFILE_OVERRIDES.get(profile_name, {})
    return replace(base, profile_name=profile_name, **overrides)


@lru_cache(maxsize=1)
def get_scoring_settings() -> ScoringSettings:
    return _apply_overrides(_base_settings(), "default")


def resolve_scoring_settings(dance_title: str | None = None, difficulty: str | None = None) -> ScoringSettings:
    base = _base_settings()
    title_key = _normalize_key(dance_title)
    difficulty_key = _normalize_key(difficulty)

    profile_name = TITLE_PROFILE_MAP.get(title_key)
    if profile_name is None:
        profile_name = DIFFICULTY_PROFILE_MAP.get(difficulty_key, "balanced")

    if profile_name == "balanced":
        return _apply_overrides(base, "balanced")
    if profile_name == "high_energy":
        return _apply_overrides(base, "high_energy")
    if profile_name == "precision":
        return _apply_overrides(base, "precision")
    if profile_name == "training":
        return _apply_overrides(base, "training")
    return _apply_overrides(base, "default")

