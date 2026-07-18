from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.kpi import KpiDefinition
from app.models.weekly_kpi_entry import WeeklyKpiEntry


def has_project_weekly_entries(db: Session, project_id: int) -> bool:
    return db.scalar(
        select(WeeklyKpiEntry.id)
        .where(WeeklyKpiEntry.project_id == project_id)
        .limit(1)
    ) is not None


def has_kpi_weekly_entries(db: Session, kpi_id: int) -> bool:
    return db.scalar(
        select(WeeklyKpiEntry.id)
        .where(WeeklyKpiEntry.kpi_id == kpi_id)
        .limit(1)
    ) is not None


def has_phase_weekly_entries(db: Session, project_id: int, phase_name: str) -> bool:
    return db.scalar(
        select(WeeklyKpiEntry.id)
        .join(KpiDefinition, WeeklyKpiEntry.kpi_id == KpiDefinition.id)
        .where(
            WeeklyKpiEntry.project_id == project_id,
            KpiDefinition.phase == phase_name,
        )
        .limit(1)
    ) is not None


def has_health_dimension_weekly_entries(db: Session, dimension_name: str) -> bool:
    return db.scalar(
        select(WeeklyKpiEntry.id)
        .join(KpiDefinition, WeeklyKpiEntry.kpi_id == KpiDefinition.id)
        .where(KpiDefinition.health_dimension == dimension_name)
        .limit(1)
    ) is not None
