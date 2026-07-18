from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class HealthDimensionBase(BaseModel):
    name: str
    description: str = ""
    score_percent: Optional[float] = None
    is_active: bool = True


class HealthDimensionCreate(HealthDimensionBase):
    pass


class HealthDimensionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    score_percent: Optional[float] = None
    is_active: Optional[bool] = None


class HealthDimensionRead(HealthDimensionBase):
    id: int

    model_config = {"from_attributes": True}
