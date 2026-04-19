from __future__ import annotations

from pydantic import BaseModel


class AdminToggleUserRequest(BaseModel):
    status: str | None = None
    is_admin: bool | None = None
    nickname: str | None = None
    points: int | None = None

