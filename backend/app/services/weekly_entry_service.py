from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models.kpi import KpiDefinition
from app.models.project import Project
from app.models.weekly_kpi_entry import WeeklyKpiEntry
from app.schemas.weekly_entry import WeeklyKpiEntryCreate


def list_entries(db: Session, project_id: Optional[int] = None) -> list[WeeklyKpiEntry]:
    query = (
        select(WeeklyKpiEntry)
        .options(joinedload(WeeklyKpiEntry.kpi))
        .order_by(WeeklyKpiEntry.week_start.desc(), WeeklyKpiEntry.kpi_id)
    )
    if project_id is not None:
        query = query.where(WeeklyKpiEntry.project_id == project_id)
    return list(db.scalars(query))


def upsert_entry(db: Session, entry: WeeklyKpiEntryCreate) -> WeeklyKpiEntry:
    if db.get(Project, entry.project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    kpi = db.get(KpiDefinition, entry.kpi_id)
    if kpi is None:
        raise HTTPException(status_code=404, detail="KPI definition not found")

    entry_data = entry.model_dump()
    if entry.applicability_status not in {"applicable", "not_relevant"}:
        raise HTTPException(status_code=400, detail="Applicability status must be applicable or not_relevant")

    if entry.applicability_status == "not_relevant":
        entry_data["value"] = entry.value if entry.value is not None else 0
        entry_data["numerator"] = None
        entry_data["denominator"] = None
        entry_data["component_values"] = entry.component_values or {}
    else:
        entry_data["value"] = entry.value if entry.value is not None else calculate_kpi_value(kpi, entry.component_values)
        entry_data["numerator"] = _component_value_for_role(kpi, entry.component_values, "numerator")
        entry_data["denominator"] = _component_value_for_role(kpi, entry.component_values, "denominator")
        entry_data["applicability_reason"] = None

    db_entry = db.scalar(
        select(WeeklyKpiEntry).where(
            WeeklyKpiEntry.project_id == entry.project_id,
            WeeklyKpiEntry.kpi_id == entry.kpi_id,
            WeeklyKpiEntry.week_start == entry.week_start,
        )
    )
    if db_entry is None:
        db_entry = WeeklyKpiEntry(**entry_data)
        db.add(db_entry)
    else:
        for field, value in entry_data.items():
            setattr(db_entry, field, value)

    db.commit()
    db.refresh(db_entry)
    return db_entry


def delete_entries(
    db: Session,
    project_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> int:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")

    statement = delete(WeeklyKpiEntry).where(WeeklyKpiEntry.project_id == project_id)
    if start_date is not None:
        statement = statement.where(WeeklyKpiEntry.week_start >= start_date)
    if end_date is not None:
        statement = statement.where(WeeklyKpiEntry.week_start <= end_date)

    result = db.execute(statement)
    db.commit()
    return int(result.rowcount or 0)


def calculate_kpi_value(kpi: KpiDefinition, component_values: dict[str, float]) -> float:
    numerator = _component_value_for_role(kpi, component_values, "numerator")
    denominator = _component_value_for_role(kpi, component_values, "denominator")
    if numerator is not None and denominator is not None:
        if denominator == 0:
            raise HTTPException(status_code=400, detail="Formula denominator cannot be zero")
        return round(numerator / denominator, 4)

    first_component = (kpi.formula_components or [{}])[0]
    component_key = first_component.get("key")
    if component_key and component_key in component_values:
        return float(component_values[component_key])

    raise HTTPException(status_code=400, detail="Missing formula component values")


def _component_value_for_role(
    kpi: KpiDefinition,
    component_values: dict[str, float],
    role: str,
) -> Optional[float]:
    component = next((item for item in kpi.formula_components or [] if item.get("role") == role), None)
    if component is None:
        return None
    value = component_values.get(component["key"])
    return float(value) if value is not None else None
