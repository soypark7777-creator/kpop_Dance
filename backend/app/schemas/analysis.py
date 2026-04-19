from __future__ import annotations

from typing import List

from pydantic import BaseModel


class SectionScore(BaseModel):
    section_index: int
    section_name: str
    start_time: float
    end_time: float
    score: float


class ReportJson(BaseModel):
    coach_comment: str
    improvement_tips: List[str]
    best_section: SectionScore


class AnalysisReport(BaseModel):
    id: int
    session_id: str
    total_score: float
    weakest_section: SectionScore
    most_wrong_joints: List[str]
    average_angle_error: float
    section_scores: List[SectionScore]
    report_json: ReportJson
