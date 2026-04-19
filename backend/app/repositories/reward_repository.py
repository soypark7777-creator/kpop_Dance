from __future__ import annotations

from ..models import RewardItem


def list_rewards():
    return RewardItem.query.order_by(RewardItem.id.asc()).all()

