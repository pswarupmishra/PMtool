from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class KpiTrendPoint(BaseModel):
    week_start: date
    value: float
    previous_value: Optional[float]
    status: str
    delta: Optional[float]


class KpiHealthRead(BaseModel):
    kpi_id: int
    code: str
    metric: str
    category: str
    phase: str
    health_dimension: str
    expected_trend: str
    weight: float
    latest_value: float
    previous_value: Optional[float]
    delta: Optional[float]
    status: str
    trend: list[KpiTrendPoint]


class DimensionHealthRead(BaseModel):
    health_dimension: str
    score: float
    total_weight: float
    green_weight: float
    red_count: int


class ProjectHealthRead(BaseModel):
    project_id: int
    project_name: str
    owner: str
    week_start: Optional[date]
    health_score: float
    health_status: str
    total_weight: float
    green_weight: float
    red_count: int
    green_count: int
    dimensions: list[DimensionHealthRead]
    kpis: list[KpiHealthRead]


class HeatmapKpiValueRead(BaseModel):
    week_start: date
    value: float
    status: str


class HeatmapKpiRead(BaseModel):
    metric: str
    threshold: Optional[float]
    has_threshold_breach: bool = False
    last_values: list[HeatmapKpiValueRead]


class HeatmapCellRead(BaseModel):
    phase: str
    health_dimension: str
    good_count: int
    bad_count: int
    total_count: int
    good_percent: float
    bad_percent: float
    monitored_count: int = 0
    monitor_breach_count: int = 0
    has_monitor_breach: bool = False
    threshold_breach_count: int = 0
    has_threshold_breach: bool = False
    kpis: list[HeatmapKpiRead] = []


class ScoreTrendPointRead(BaseModel):
    week_start: date
    score: float


class ProjectHeatmapRead(BaseModel):
    project_id: int
    project_name: str
    mode: str
    week_start: Optional[date]
    phases: list[str]
    health_dimensions: list[str]
    health_dimension_scores: dict[str, float]
    score_trend: list[ScoreTrendPointRead]
    cells: list[HeatmapCellRead]
