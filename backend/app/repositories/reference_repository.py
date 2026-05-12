from __future__ import annotations

from ..models import DanceReference


def list_references() -> list[DanceReference]:
    return DanceReference.query.order_by(DanceReference.id.asc()).all()


def get_reference_by_id(reference_id: int) -> DanceReference | None:
    return DanceReference.query.filter_by(id=reference_id).first()
