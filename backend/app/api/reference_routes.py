from flask import Blueprint

from ..extensions import db
from ..models import DanceReference
from ..repositories.reference_repository import get_reference_by_id, list_references
from ..services.demo_data import DEMO_DANCE_REFERENCES
from ..services.reference_service import fallback_references, serialize_reference
from ..utils.response import error_response, success_response


bp = Blueprint("reference", __name__)


def seed_demo_references_if_empty() -> None:
    if list_references():
        return
    for item in DEMO_DANCE_REFERENCES:
        db.session.add(
            DanceReference(
                title=item["title"],
                artist_name=item["artist_name"],
                difficulty=item["difficulty"],
                duration_seconds=item["duration_seconds"],
                thumbnail_url=item["thumbnail_url"],
                preview_video_url=item.get("preview_video_url"),
                reference_json_path=item["reference_json_path"],
            )
        )
    db.session.commit()


@bp.get("/dance-references")
def get_dance_references():
    references = list_references()
    if not references:
        return success_response(data=fallback_references(), message="안무 목록을 불러왔습니다.")
    return success_response(data=[serialize_reference(reference) for reference in references], message="안무 목록을 불러왔습니다.")


@bp.get("/dance-references/<int:reference_id>")
def get_dance_reference(reference_id: int):
    reference = get_reference_by_id(reference_id)
    if reference is not None:
        return success_response(data=serialize_reference(reference), message="안무를 불러왔습니다.")
    return error_response("dance reference not found", status_code=404, code="DANCE_REFERENCE_NOT_FOUND")
