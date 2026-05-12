from __future__ import annotations

from typing import Any

from ..models import DanceReference
from .demo_data import DEMO_DANCE_REFERENCES
from .session_service import isoformat


def serialize_reference(reference: DanceReference) -> dict[str, Any]:
    return {
        "id": reference.id,
        "title": reference.title,
        "artist_name": reference.artist_name,
        "difficulty": reference.difficulty,
        "duration_seconds": reference.duration_seconds,
        "thumbnail_url": reference.thumbnail_url,
        "preview_video_url": reference.preview_video_url,
        "reference_json_path": reference.reference_json_path,
        "created_at": isoformat(reference.created_at),
    }


def fallback_references() -> list[dict[str, Any]]:
    return DEMO_DANCE_REFERENCES
