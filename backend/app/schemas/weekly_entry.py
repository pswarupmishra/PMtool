from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel

from app.schemas.kpi import KpiDefinitionRead


class WeeklyKpiEntryBase(BaseModel):
    project_id: int
    kpi_id: int
    week_start: date
    value: Optional[float] = None
    numerator: Optional[float] = None
    denominator: Optional[float] = None
    component_values: dict[str, float] = {}
    applicability_status: str = "applicable"
    applicability_reason: Optional[str] = None
    notes: Optional[str] = None


class WeeklyKpiEntryCreate(WeeklyKpiEntryBase):
    pass


class WeeklyKpiEntryRead(WeeklyKpiEntryBase):
    id: int
    value: float
    kpi: Optional[KpiDefinitionRead] = None

    model_config = {"from_attributes": True}
