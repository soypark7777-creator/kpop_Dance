from __future__ import annotations

from flask import Blueprint, current_app, request, send_from_directory

from ..services.video_upload_service import (
    create_video_upload,
    get_video_upload,
    upload_file_path,
    upload_frame_path,
)
from ..utils.response import error_response, success_response


bp = Blueprint("uploads", __name__)


@bp.post("/uploads/video")
def upload_video():
    video_file = request.files.get("video")
    if video_file is None or not video_file.filename:
        return error_response("video file is required", status_code=400, code="INVALID_REQUEST")

    dance_reference_id = request.form.get("dance_reference_id")
    session_id = request.form.get("session_id")
    user_id = request.form.get("user_id")
    notes = request.form.get("notes")

    try:
        payload = create_video_upload(
            video_file,
            dance_reference_id=int(dance_reference_id) if dance_reference_id else None,
            session_id=session_id or None,
            user_id=int(user_id) if user_id else None,
            notes=notes or None,
        )
    except ValueError:
        return error_response("invalid upload payload", status_code=400, code="INVALID_REQUEST")

    return success_response(data=payload, message="video uploaded")


@bp.get("/uploads/video/<upload_id>")
def get_upload(upload_id: str):
    payload = get_video_upload(upload_id)
    if payload is None:
        return error_response("upload not found", status_code=404, code="UPLOAD_NOT_FOUND")
    return success_response(data=payload)


@bp.get("/uploads/video/<upload_id>/file")
def download_upload_file(upload_id: str):
    path = upload_file_path(upload_id)
    if path is None:
        return error_response("upload not found", status_code=404, code="UPLOAD_NOT_FOUND")
    return send_from_directory(path.parent, path.name, as_attachment=False)


@bp.get("/uploads/video/<upload_id>/frames/<frame_name>")
def download_upload_frame(upload_id: str, frame_name: str):
    path = upload_frame_path(upload_id, frame_name)
    if path is None:
        return error_response("frame not found", status_code=404, code="FRAME_NOT_FOUND")
    return send_from_directory(path.parent, path.name, as_attachment=False)
