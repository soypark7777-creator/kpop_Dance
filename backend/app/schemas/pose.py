from __future__ import annotations

from typing import Dict, Optional

from pydantic import BaseModel, Field


class JointPoint(BaseModel):
    x: float
    y: float
    z: Optional[float] = None
    visibility: Optional[float] = None


class JointError(BaseModel):
    joint: str
    status: str
    angle_diff: Optional[float] = None
    direction: Optional[str] = None


class FeedbackMessage(BaseModel):
    level: str
    text: str
    target_joint: Optional[str] = None
    timestamp: int = Field(default=0)


class LiveFrameData(BaseModel):
    session_id: str
    timestamp: int
    user_pose: Dict[str, JointPoint]
    reference_pose: Dict[str, JointPoint]
    joint_errors: Dict[str, JointError]
    feedback: FeedbackMessage
    match_score: float
    is_recording: bool
    section_index: Optional[int] = None
