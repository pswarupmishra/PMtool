from __future__ import annotations

from datetime import date
from typing import Optional

from sqlalchemy import Date, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    owner: Mapped[str] = mapped_column(String(120), nullable=False)
    location: Mapped[str] = mapped_column(String(120), default="")
    vendor: Mapped[str] = mapped_column(String(120), default="")
    project_type: Mapped[str] = mapped_column(String(80), default="")
    status: Mapped[str] = mapped_column(String(40), default="on_track")
    start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    target_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    weekly_entries = relationship("WeeklyKpiEntry", back_populates="project", cascade="all, delete-orphan")
    phases = relationship("ProjectPhase", back_populates="project", cascade="all, delete-orphan")
