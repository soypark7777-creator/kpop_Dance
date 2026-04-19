from __future__ import annotations

import json
import time

from flask import Blueprint, Response, request, stream_with_context

from ..models import PracticeSession
from ..services.angle_service import calculate_joint_angles
from ..services.session_service import (
    build_live_frame_payload,
    get_demo_state,
    get_stream_reference_pose,
    parse_session_id,
)
from ..utils.response import error_response


bp = Blueprint("stream", __name__)


def _is_session_active(session_id: str) -> bool:
    demo_state = get_demo_state(session_id)
    if demo_state is not None:
        return demo_state.session.get("session_status") == "in_progress"

    parsed_session_id = parse_session_id(session_id)
    if parsed_session_id is None:
        return False

    session = PracticeSession.query.filter_by(id=parsed_session_id).first()
    if session is None:
        return False
    return session.session_status == "active"


def _session_exists(session_id: str) -> bool:
    if get_demo_state(session_id) is not None:
        return True
    parsed_session_id = parse_session_id(session_id)
    if parsed_session_id is None:
        return False
    return PracticeSession.query.filter_by(id=parsed_session_id).first() is not None


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
            yield f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

            if not active:
                break

            frame_index += 1
            time.sleep(1 / 15)

    headers = {
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
    }
    return Response(stream_with_context(event_stream()), mimetype="text/event-stream", headers=headers)
