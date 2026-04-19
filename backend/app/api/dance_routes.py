from flask import Blueprint

from ..extensions import db
from ..models import DanceReference
from ..services.demo_data import DEMO_DANCE_REFERENCES
from ..utils.response import error_response, success_response


bp = Blueprint("dance", __name__)


def _serialize_dance(dance: DanceReference) -> dict:
    return {
        "id": dance.id,
        "title": dance.title,
        "artist_name": dance.artist_name,
        "difficulty": dance.difficulty,
        "duration_seconds": dance.duration_seconds,
        "thumbnail_url": dance.thumbnail_url,
        "preview_video_url": dance.preview_video_url,
        "reference_json_path": dance.reference_json_path,
        "created_at": dance.created_at.isoformat() if dance.created_at else None,
    }


@bp.get("/dance-references")
def get_dance_references():
    dances = DanceReference.query.order_by(DanceReference.id.asc()).all()
    if not dances:
        return success_response(data=DEMO_DANCE_REFERENCES)
    return success_response(data=[_serialize_dance(dance) for dance in dances])


@bp.get("/dance-references/<int:dance_id>")
def get_dance_reference(dance_id: int):
    dance = db.session.get(DanceReference, dance_id)
    if dance is None:
        for item in DEMO_DANCE_REFERENCES:
            if item["id"] == dance_id:
                return success_response(data=item)
        return error_response("dance reference not found", status_code=404, code="DANCE_REFERENCE_NOT_FOUND")
    return success_response(data=_serialize_dance(dance))
