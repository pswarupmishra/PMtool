from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    assignee: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="todo")
    priority: Mapped[str] = mapped_column(String(40), default="medium")
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)

    project = relationship("Project", back_populates="tasks")
