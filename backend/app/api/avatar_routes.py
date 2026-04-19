from flask import Blueprint, request
from sqlalchemy.orm import selectinload

from ..models import PracticeSession, SessionFrame, User
from ..services.avatar_service import build_unity_export, create_avatar_render, get_avatar_items, get_avatar_render
from ..services.session_service import get_demo_state
from ..utils.response import error_response, success_response


bp = Blueprint("avatar", __name__)


def _resolve_user_metrics() -> tuple[int, float]:
    user = User.query.order_by(User.id.asc()).first()
    if user is None:
        return 0, 0.0

    points = int(user.points or 0)
    sessions = (
        PracticeSession.query.filter_by(user_id=user.id)
        .options(selectinload(PracticeSession.dance_reference))
        .order_by(PracticeSession.total_score.desc().nullslast(), PracticeSession.started_at.desc())
        .all()
    )
    best_score = 0.0
    for session in sessions:
        if session.total_score is not None:
            best_score = max(best_score, float(session.total_score))
    return points, best_score


@bp.get("/avatar/items")
def list_avatar_items():
    item_type = request.args.get("type")
    if item_type not in {None, "avatar", "stage", "costume"}:
        return error_response("type must be avatar, stage, or costume", status_code=400, code="INVALID_REQUEST")

    user_points, best_score = _resolve_user_metrics()
    items = get_avatar_items(item_type=item_type, user_points=user_points, best_score=best_score)
    return success_response(data=items)


@bp.post("/avatar/render")
def request_avatar_render():
    payload = request.get_json(silent=True) or {}
    session_id = payload.get("session_id")
    avatar_id = payload.get("avatar_id")
    stage_theme_id = payload.get("stage_theme_id")
    costume_id = payload.get("costume_id")

    missing = [name for name, value in (
        ("session_id", session_id),
        ("avatar_id", avatar_id),
        ("stage_theme_id", stage_theme_id),
        ("costume_id", costume_id),
    ) if not value]
    if missing:
        return error_response(
            f"{', '.join(missing)} is required",
            status_code=400,
            code="INVALID_REQUEST",
        )

    try:
        render = create_avatar_render(str(session_id), str(avatar_id), str(stage_theme_id), str(costume_id))
    except ValueError:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    return success_response(data=render, message="avatar render requested")


@bp.get("/avatar/render/<int:render_id>")
def get_avatar_render_status(render_id: int):
    render = get_avatar_render(render_id)
    if render is None:
        return error_response("render not found", status_code=404, code="RENDER_NOT_FOUND")
    return success_response(data=render)


@bp.get("/avatar/export/<session_id>")
def get_avatar_export(session_id: str):
    export = build_unity_export(session_id)
    if export is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")
    return success_response(data=export)
