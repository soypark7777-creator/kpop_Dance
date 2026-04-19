from sqlalchemy import func

from ..extensions import db
from .base import BaseModel, TimestampMixin


class UserRewardItem(TimestampMixin, BaseModel):
    __tablename__ = "user_reward_items"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    user_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    reward_item_id = db.Column(
        db.BigInteger().with_variant(db.Integer, "sqlite"),
        db.ForeignKey("reward_items.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
    )
    acquired_at = db.Column(db.DateTime, nullable=False, server_default=func.now())
