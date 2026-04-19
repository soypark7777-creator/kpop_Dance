from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from flask import current_app
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

try:  # Optional dependency for local frame extraction
    import cv2  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    cv2 = None

from ..services.security_service import current_identity

VIDEO_EXTENSIONS = {".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv"}
VIDEO_UPLOAD_CACHE: dict[str, dict[str, Any]] = {}


@dataclass
class VideoExtractionResult:
    frame_count: int
    fps: float
    duration_seconds: float | None
    preview_frames: list[dict[str, Any]]
    message: str | None = None


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _storage_root() -> Path:
    configured = Path(current_app.config["VIDEO_UPLOAD_DIR"])
    if configured.is_absolute():
        return configured
    return Path(current_app.root_path) / configured


def _job_dir(upload_id: str) -> Path:
    return _storage_root() / upload_id


def _frames_dir(upload_id: str) -> Path:
    return _job_dir(upload_id) / "frames"


def _metadata_path(upload_id: str) -> Path:
    return _job_dir(upload_id) / "metadata.json"


def _source_path(upload_id: str, original_filename: str) -> Path:
    filename = secure_filename(original_filename) or "upload.mp4"
    suffix = Path(filename).suffix.lower()
    if suffix not in VIDEO_EXTENSIONS:
        suffix = ".mp4"
    return _job_dir(upload_id) / f"source{suffix}"


def _normalize_preview_frames(upload_id: str, preview_frames: list[dict[str, Any]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for frame in preview_frames:
        frame_name = frame.get("file_name")
        if not frame_name:
            continue
        normalized.append(
            {
                "frame_index": int(frame.get("frame_index", 0)),
                "timestamp_seconds": float(frame.get("timestamp_seconds", 0.0)),
                "file_name": frame_name,
                "file_url": frame.get("file_url") or f"/api/uploads/video/{upload_id}/frames/{frame_name}",
            }
        )
    return normalized


def _write_metadata(upload_id: str, metadata: dict[str, Any]) -> None:
    metadata_path = _metadata_path(upload_id)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_metadata(upload_id: str) -> dict[str, Any] | None:
    metadata_path = _metadata_path(upload_id)
    if not metadata_path.exists():
        return None
    try:
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    if isinstance(payload, dict):
        payload["preview_frames"] = _normalize_preview_frames(upload_id, payload.get("preview_frames") or [])
        return payload
    return None


def _build_job_payload(upload_id: str, metadata: dict[str, Any]) -> dict[str, Any]:
    payload = dict(metadata)
    payload["id"] = upload_id
    payload["preview_frames"] = _normalize_preview_frames(upload_id, payload.get("preview_frames") or [])
    payload["source_video_url"] = payload.get("source_video_url") or f"/api/uploads/video/{upload_id}/file"
    payload["status"] = payload.get("status") or "uploaded"
    payload["updated_at"] = payload.get("updated_at") or now_iso()
    return payload


def _infer_user_id(explicit_user_id: int | None = None) -> int:
    if explicit_user_id:
        return explicit_user_id

    claims = current_identity() or {}
    try:
        claim_user_id = int(claims.get("sub") or 0)
        if claim_user_id > 0:
            return claim_user_id
    except (TypeError, ValueError):
        pass

    from ..services.session_service import pick_default_user

    user = pick_default_user()
    return int(user.id) if user is not None else 1


def _extract_preview_frames(upload_id: str, source_path: Path, preview_count: int, preview_fps: float) -> VideoExtractionResult:
    if cv2 is None:
        return VideoExtractionResult(
            frame_count=0,
            fps=0.0,
            duration_seconds=None,
            preview_frames=[],
            message="opencv is not installed, so frame extraction is unavailable",
        )

    capture = cv2.VideoCapture(str(source_path))
    if not capture.isOpened():
        return VideoExtractionResult(
            frame_count=0,
            fps=0.0,
            duration_seconds=None,
            preview_frames=[],
            message="unable to open uploaded video",
        )

    try:
        fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
        if fps <= 0:
            fps = max(preview_fps, 1.0)

        frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration_seconds = round(frame_count / fps, 3) if frame_count > 0 else None
        frames_dir = _frames_dir(upload_id)
        frames_dir.mkdir(parents=True, exist_ok=True)

        preview_frames: list[dict[str, Any]] = []
        sample_indices: list[int] = []

        if frame_count > 0:
            target_count = min(max(preview_count, 1), frame_count)
            if target_count == 1:
                sample_indices = [0]
            else:
                step = (frame_count - 1) / float(target_count - 1)
                sample_indices = sorted(
                    {int(round(index * step)) for index in range(target_count)}
                )
        else:
            sample_step = max(1, int(round(fps / max(preview_fps, 0.1))))
            frame_limit = max(preview_count * sample_step, preview_count)
            for index in range(0, frame_limit, sample_step):
                sample_indices.append(index)

        for position, frame_index in enumerate(sample_indices):
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            success, frame = capture.read()
            if not success:
                continue

            frame_name = f"frame_{position + 1:03d}_{frame_index:06d}.jpg"
            frame_path = frames_dir / frame_name
            if not cv2.imwrite(str(frame_path), frame):  # pragma: no cover - depends on cv2 runtime
                continue

            preview_frames.append(
                {
                    "frame_index": int(frame_index),
                    "timestamp_seconds": round(frame_index / fps, 3),
                    "file_name": frame_name,
                    "file_url": f"/api/uploads/video/{upload_id}/frames/{frame_name}",
                }
            )

        return VideoExtractionResult(
            frame_count=frame_count,
            fps=round(fps, 3),
            duration_seconds=duration_seconds,
            preview_frames=preview_frames,
            message=None if preview_frames else "no preview frames were extracted",
        )
    finally:
        capture.release()


def create_video_upload(
    video_file: FileStorage,
    *,
    dance_reference_id: int | None = None,
    session_id: str | None = None,
    user_id: int | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    upload_id = f"upload_{uuid4().hex[:12]}"
    resolved_user_id = _infer_user_id(user_id)
    filename = secure_filename(video_file.filename or "upload.mp4") or "upload.mp4"

    job_dir = _job_dir(upload_id)
    job_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = _frames_dir(upload_id)
    frames_dir.mkdir(parents=True, exist_ok=True)

    source_path = _source_path(upload_id, filename)
    video_file.save(str(source_path))

    metadata: dict[str, Any] = {
        "id": upload_id,
        "user_id": resolved_user_id,
        "dance_reference_id": int(dance_reference_id) if dance_reference_id is not None else None,
        "session_id": session_id,
        "original_filename": filename,
        "stored_filename": source_path.name,
        "source_video_url": f"/api/uploads/video/{upload_id}/file",
        "source_video_path": str(source_path),
        "frames_dir": str(frames_dir),
        "preview_frames": [],
        "status": "uploaded",
        "frame_extraction_available": cv2 is not None,
        "source_frame_count": 0,
        "source_fps": 0.0,
        "source_duration_seconds": None,
        "extracted_frame_count": 0,
        "notes": notes,
        "message": "video uploaded",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    if cv2 is None:
        metadata["status"] = "extraction_unavailable"
        metadata["message"] = "video stored, but OpenCV is not installed so frames were not extracted"
    else:
        result = _extract_preview_frames(
            upload_id,
            source_path,
            int(current_app.config["VIDEO_PREVIEW_FRAME_COUNT"]),
            float(current_app.config["VIDEO_PREVIEW_FPS"]),
        )
        metadata["source_frame_count"] = result.frame_count
        metadata["source_fps"] = result.fps
        metadata["source_duration_seconds"] = result.duration_seconds
        metadata["preview_frames"] = result.preview_frames[: int(current_app.config["VIDEO_PREVIEW_FRAME_COUNT"])]
        metadata["extracted_frame_count"] = len(metadata["preview_frames"])
        if result.preview_frames:
            metadata["status"] = "completed"
            metadata["message"] = "video uploaded and preview frames extracted"
        else:
            metadata["status"] = "failed"
            metadata["message"] = result.message or "frame extraction failed"

    from .video_analysis_service import analyze_upload_frames

    analysis_result = analyze_upload_frames(metadata)
    metadata["analysis_ready"] = bool(analysis_result.get("analysis_ready"))
    metadata["analysis_source"] = analysis_result.get("analysis_source")
    metadata["analysis_session_id"] = analysis_result.get("analysis_session_id")
    metadata["report_url"] = analysis_result.get("report_url")
    metadata["analysis_report"] = analysis_result.get("report")
    metadata["analysis_session"] = analysis_result.get("session")
    metadata["analysis_frames"] = analysis_result.get("frames")

    _write_metadata(upload_id, metadata)
    payload = _build_job_payload(upload_id, metadata)
    VIDEO_UPLOAD_CACHE[upload_id] = payload
    return payload


def get_video_upload(upload_id: str) -> dict[str, Any] | None:
    cached = VIDEO_UPLOAD_CACHE.get(upload_id)
    if cached is not None:
        return _build_job_payload(upload_id, cached)

    metadata = _read_metadata(upload_id)
    if metadata is None:
        return None
    payload = _build_job_payload(upload_id, metadata)
    VIDEO_UPLOAD_CACHE[upload_id] = payload
    return payload


def upload_file_path(upload_id: str) -> Path | None:
    job = get_video_upload(upload_id)
    if job is None:
        return None
    stored_filename = job.get("stored_filename")
    if not isinstance(stored_filename, str):
        return None
    path = _job_dir(upload_id) / stored_filename
    return path if path.exists() else None


def upload_frame_path(upload_id: str, frame_name: str) -> Path | None:
    path = _frames_dir(upload_id) / frame_name
    return path if path.exists() else None


def list_video_uploads() -> list[dict[str, Any]]:
    root = _storage_root()
    if not root.exists():
        return []

    uploads: list[dict[str, Any]] = []
    for job_dir in sorted(root.glob("upload_*"), key=lambda path: path.stat().st_mtime if path.exists() else 0, reverse=True):
        if not job_dir.is_dir():
            continue
        metadata = _read_metadata(job_dir.name)
        if metadata is None:
            continue
        payload = _build_job_payload(job_dir.name, metadata)
        payload["frame_count"] = len(payload.get("preview_frames") or [])
        uploads.append(payload)
        VIDEO_UPLOAD_CACHE[job_dir.name] = payload
    return uploads
