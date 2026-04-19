from __future__ import annotations

from ..models import DanceReference


def list_dances():
    return DanceReference.query.order_by(DanceReference.id.asc()).all()


def get_dance_by_id(dance_id: int) -> DanceReference | None:
    return DanceReference.query.filter_by(id=dance_id).first()

