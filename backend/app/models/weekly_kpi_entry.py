from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from sqlalchemy import JSON, Date, DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class WeeklyKpiEntry(Base):
    __tablename__ = "weekly_kpi_entries"
    __table_args__ = (
        UniqueConstraint("project_id", "kpi_id", "week_start", name="uq_project_kpi_week"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    kpi_id: Mapped[int] = mapped_column(ForeignKey("kpi_definitions.id"), nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    numerator: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    denominator: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    component_values: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    notes: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="weekly_entries")
    kpi = relationship("KpiDefinition", back_populates="weekly_entries")
