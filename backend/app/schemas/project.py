from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class ProjectBase(BaseModel):
    name: str
    owner: str
    location: str = ""
    vendor: str = ""
    project_type: str = ""
    status: str = "on_track"
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    owner: Optional[str] = None
    location: Optional[str] = None
    vendor: Optional[str] = None
    project_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    target_date: Optional[date] = None


class ProjectRead(ProjectBase):
    id: int

    model_config = {"from_attributes": True}
