from __future__ import annotations

from pydantic import BaseModel


class AvatarRenderRequest(BaseModel):
    session_id: str | int
    avatar_id: str
    stage_theme_id: str
    costume_id: str

