from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class ProjectPhaseBase(BaseModel):
    project_id: int
    name: str
    sort_order: int = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: bool = True


class ProjectPhaseCreate(ProjectPhaseBase):
    pass


class ProjectPhaseUpdate(BaseModel):
    name: Optional[str] = None
    sort_order: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class ProjectPhaseRead(ProjectPhaseBase):
    id: int

    model_config = {"from_attributes": True}
