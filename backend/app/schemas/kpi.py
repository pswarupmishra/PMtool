from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class FormulaComponentRead(BaseModel):
    key: str
    label: str
    role: str


class KpiDefinitionBase(BaseModel):
    code: str
    category: str
    metric: str
    formula: str
    formula_components: list[FormulaComponentRead] = []
    metric_type: str
    phase: str
    health_dimension: str
    expected_trend: str = Field(pattern="^(positive|negative|equal)$")
    threshold: Optional[float] = None
    monitor_period_weeks: Optional[int] = None
    weight: float = 1.0
    is_leading_indicator: bool = True
    is_active: bool = True


class KpiDefinitionCreate(KpiDefinitionBase):
    pass


class KpiDefinitionUpdate(BaseModel):
    code: Optional[str] = None
    category: Optional[str] = None
    metric: Optional[str] = None
    formula: Optional[str] = None
    formula_components: Optional[list[FormulaComponentRead]] = None
    metric_type: Optional[str] = None
    phase: Optional[str] = None
    health_dimension: Optional[str] = None
    expected_trend: Optional[str] = Field(default=None, pattern="^(positive|negative|equal)$")
    threshold: Optional[float] = None
    monitor_period_weeks: Optional[int] = None
    weight: Optional[float] = None
    is_leading_indicator: Optional[bool] = None
    is_active: Optional[bool] = None


class KpiDefinitionRead(KpiDefinitionBase):
    id: int

    model_config = {"from_attributes": True}
