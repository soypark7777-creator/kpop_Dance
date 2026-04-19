from ..extensions import db
from .base import BaseModel, TimestampMixin


class RewardItem(TimestampMixin, BaseModel):
    __tablename__ = "reward_items"

    id = db.Column(db.BigInteger().with_variant(db.Integer, "sqlite"), primary_key=True)
    item_type = db.Column(
        db.Enum("avatar", "stage", "costume", "effect", name="reward_item_type"),
        nullable=False,
        index=True,
    )
    item_name = db.Column(db.String(100), nullable=False)
    price_points = db.Column(db.Integer, nullable=False, default=0)
    is_premium = db.Column(db.Boolean, nullable=False, default=False, index=True)
    metadata_json = db.Column(db.JSON, nullable=True)
