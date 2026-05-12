from __future__ import annotations

import json
import time

from flask import Blueprint, Response, request, stream_with_context

from ..extensions import db
from ..models import SessionFrame
from ..services.angle_service import calculate_joint_angles
from ..services.session_service import (
    build_live_frame_payload,
    get_session_by_identifier,
    get_demo_state,
    get_stream_reference_pose,
)
from ..utils.response import error_response


bp = Blueprint("stream", __name__)

STREAM_FPS = 8


def _is_session_active(session_id: str) -> bool:
    demo_state = get_demo_state(session_id)
    if demo_state is not None:
        return demo_state.session.get("session_status") == "in_progress"

    session = get_session_by_identifier(session_id)
    if session is None:
        return False
    return session.session_status == "active"


def _session_exists(session_id: str) -> bool:
    if get_demo_state(session_id) is not None:
        return True
    return get_session_by_identifier(session_id) is not None


def _persist_frame(session_id: str, frame_index: int, payload: dict) -> None:
    session = get_session_by_identifier(session_id)
    if session is None:
        return
    try:
        db.session.add(
            SessionFrame(
                session_id=session.id,
                frame_index=frame_index,
                timestamp_seconds=round(frame_index / STREAM_FPS, 3),
                pose_json=payload.get("user_pose") or {},
                score=float(payload.get("match_score") or 0),
            )
        )
        db.session.commit()
    except Exception:
        db.session.rollback()


@bp.get("/stream/live")
def live_stream():
    session_id = request.args.get("session_id")
    include_debug = str(request.args.get("debug", "")).lower() in {"1", "true", "yes", "on"}
    if not session_id:
        return error_response("session_id is required", status_code=400, code="INVALID_REQUEST")

    if not _session_exists(session_id):
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    def event_stream():
        frame_index = 0
        yield "retry: 3000\n\n"
        try:
            while True:
                active = _is_session_active(session_id)
                reference_pose = get_stream_reference_pose(session_id, frame_index)
                payload = build_live_frame_payload(session_id, frame_index, reference_pose=reference_pose)
                payload["is_recording"] = active
                if include_debug:
                    user_pose = payload.get("user_pose") if isinstance(payload, dict) else {}
                    reference_pose_payload = payload.get("reference_pose") if isinstance(payload, dict) else {}
                    payload["joint_debug"] = {
                        "user_angles": calculate_joint_angles(user_pose or {}),
                        "reference_angles": calculate_joint_angles(reference_pose_payload or {}),
                        "top_error_joints": sorted(
                            (
                                payload.get("joint_errors") or {}
                            ).items(),
                            key=lambda item: float(item[1].get("angle_diff", 0.0)) if isinstance(item[1], dict) else 0.0,
                            reverse=True,
                        )[:3],
                    }
                _persist_frame(session_id, frame_index, payload)
                yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

                if not active:
                    break

                frame_index += 1
                time.sleep(1 / STREAM_FPS)
        except GeneratorExit:
            return
        except Exception:
            db.session.rollback()
            return

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream", headers=headers)
