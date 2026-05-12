from __future__ import annotations

from pydantic import BaseModel


class DanceReferenceResponse(BaseModel):
    id: int
    title: str
    artist_name: str
    difficulty: str
    duration_seconds: int
    thumbnail_url: str | None = None
    preview_video_url: str | None = None
    reference_json_path: str
    created_at: str | None = None
