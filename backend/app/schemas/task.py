from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class TaskBase(BaseModel):
    title: str
    assignee: Optional[str] = None
    status: str = "todo"
    priority: str = "medium"
    project_id: int


class TaskCreate(TaskBase):
    pass


class TaskRead(TaskBase):
    id: int

    model_config = {"from_attributes": True}
