from flask import Blueprint

from ..extensions import db
from ..models import SessionFrame
from ..services.analysis_service import serialize_analysis_report, upsert_analysis_report
from ..services.session_service import (
    finalize_demo_session,
    get_session_by_identifier,
    get_demo_state,
)
from ..utils.response import error_response, success_response


bp = Blueprint("analysis", __name__)


@bp.get("/analysis/<session_id>")
def get_analysis(session_id: str):
    demo_state = get_demo_state(session_id)
    if demo_state is not None:
        if demo_state.report is None:
            finalized = finalize_demo_session(session_id)
            if finalized is None or finalized.report is None:
                return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")
        return success_response(data=demo_state.report)

    session = get_session_by_identifier(session_id)
    if session is None:
        return error_response("session not found", status_code=404, code="SESSION_NOT_FOUND")

    frames = (
        SessionFrame.query.filter_by(session_id=session.id)
        .order_by(SessionFrame.frame_index.asc())
        .all()
    )
    report = upsert_analysis_report(session, frames)
    db.session.commit()
    db.session.refresh(session)
    db.session.refresh(report)
    return success_response(data=serialize_analysis_report(report))

