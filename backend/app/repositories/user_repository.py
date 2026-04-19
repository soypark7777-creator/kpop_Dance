from __future__ import annotations

from ..models import User


def get_first_user() -> User | None:
    return User.query.order_by(User.id.asc()).first()


def get_user_by_id(user_id: int) -> User | None:
    return User.query.filter_by(id=user_id).first()

