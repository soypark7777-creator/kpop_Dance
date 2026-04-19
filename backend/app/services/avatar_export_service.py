from __future__ import annotations

from .avatar_service import build_unity_export


def export_session_to_unity(session_identifier: str | int) -> dict:
    payload = build_unity_export(session_identifier)
    if payload is None:
        raise ValueError("session not found")
    return payload
