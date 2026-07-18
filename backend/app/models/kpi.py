from typing import Optional

from sqlalchemy import JSON, Boolean, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class KpiDefinition(Base):
    __tablename__ = "kpi_definitions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    metric: Mapped[str] = mapped_column(String(180), nullable=False)
    formula: Mapped[str] = mapped_column(Text, nullable=False)
    formula_components: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    metric_type: Mapped[str] = mapped_column(String(60), nullable=False)
    phase: Mapped[str] = mapped_column(String(80), nullable=False)
    health_dimension: Mapped[str] = mapped_column(String(100), nullable=False)
    expected_trend: Mapped[str] = mapped_column(String(20), nullable=False)
    threshold: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    monitor_period_weeks: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    is_leading_indicator: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    weekly_entries = relationship("WeeklyKpiEntry", back_populates="kpi")
