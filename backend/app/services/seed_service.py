from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.data.kpi_seed import DEFAULT_KPIS
from app.models.health_dimension import HealthDimension
from app.models.kpi import KpiDefinition
from app.models.project import Project
from app.models.project_phase import ProjectPhase
from app.models.weekly_kpi_entry import WeeklyKpiEntry


PHASE_ORDER = [
    "Requirement Analysis",
    "Solution Design",
    "Sprint Development",
    "Testing",
    "Deployment Readiness",
]

PHASE_DATE_DEFAULTS = {
    "Requirement Analysis": ("2026-06-01", "2026-06-28"),
    "Solution Design": ("2026-06-29", "2026-07-26"),
    "Sprint Development": ("2026-07-27", "2026-09-20"),
    "Testing": ("2026-09-21", "2026-10-18"),
    "Deployment Readiness": ("2026-10-19", "2026-11-08"),
}

HEALTH_DIMENSION_SCORE_DEFAULTS = {
    "User Engagement Index": 20,
    "Dependency Fulfillment Index": 20,
    "Delivery Predictability": 20,
    "Scope Stability": 15,
    "Complexity Variance": 10,
    "Quality Index": 10,
    "Flow Efficiency": 5,
}


def seed_defaults(db: Session) -> None:
    existing_kpis = db.scalar(select(KpiDefinition.id).limit(1))
    if existing_kpis is None:
        db.add_all(KpiDefinition(**kpi) for kpi in DEFAULT_KPIS)
        db.commit()
    else:
        _sync_kpi_catalog(db)

    _sync_health_dimensions(db)

    existing_project = db.scalar(select(Project.id).limit(1))
    if existing_project is None:
        project = Project(
            name="JSW MES Rollout",
            owner="PM Office",
            location="VJNR, Monnet",
            vendor="Implementation Partner",
            project_type="MES",
            status="on_track",
        )
        db.add(project)
        db.commit()
        db.refresh(project)
        _sync_project_phases(db, project.id)
        _seed_weekly_entries(db, project.id)
    else:
        for project_id in db.scalars(select(Project.id)):
            _sync_project_phases(db, project_id)


def _seed_weekly_entries(db: Session, project_id: int) -> None:
    kpis = list(db.scalars(select(KpiDefinition).where(KpiDefinition.is_active.is_(True))))
    week_values = {
        "2026-06-22": {
            "requirements_identified_vs_planned": 0.72,
            "scope_growth_percent": 0.18,
            "requirement_volatility_percent": 0.21,
            "business_attendance_percent": 0.78,
            "decision_closure_rate": 0.62,
            "brd_completion_percent": 0.64,
            "master_data_availability_percent": 0.55,
            "open_assumptions": 14,
        },
        "2026-06-29": {
            "requirements_identified_vs_planned": 0.81,
            "scope_growth_percent": 0.15,
            "requirement_volatility_percent": 0.18,
            "business_attendance_percent": 0.84,
            "decision_closure_rate": 0.69,
            "brd_completion_percent": 0.73,
            "master_data_availability_percent": 0.68,
            "open_assumptions": 11,
        },
        "2026-07-06": {
            "requirements_identified_vs_planned": 0.86,
            "scope_growth_percent": 0.17,
            "requirement_volatility_percent": 0.16,
            "business_attendance_percent": 0.88,
            "decision_closure_rate": 0.74,
            "brd_completion_percent": 0.82,
            "master_data_availability_percent": 0.77,
            "open_assumptions": 9,
        },
        "2026-07-13": {
            "requirements_identified_vs_planned": 0.91,
            "scope_growth_percent": 0.13,
            "requirement_volatility_percent": 0.12,
            "business_attendance_percent": 0.91,
            "decision_closure_rate": 0.81,
            "brd_completion_percent": 0.9,
            "master_data_availability_percent": 0.84,
            "open_assumptions": 7,
        },
    }

    entries = []
    for week_start, values in week_values.items():
        for kpi in kpis:
            if kpi.code in values:
                entries.append(
                    WeeklyKpiEntry(
                        project_id=project_id,
                        kpi_id=kpi.id,
                        week_start=date.fromisoformat(week_start),
                        value=values[kpi.code],
                        component_values=_component_values_for_seed(kpi, values[kpi.code]),
                    )
                )
    db.add_all(entries)
    db.commit()


def _sync_kpi_catalog(db: Session) -> None:
    by_code = {str(kpi["code"]): kpi for kpi in DEFAULT_KPIS}
    by_metric = {str(kpi["metric"]): kpi for kpi in DEFAULT_KPIS}
    existing = list(db.scalars(select(KpiDefinition)))
    matched_codes = set()
    changed = False

    for kpi in existing:
        source = by_code.get(kpi.code) or by_metric.get(kpi.metric)
        if source is None:
            if kpi.is_active:
                kpi.is_active = False
                changed = True
            continue

        matched_codes.add(str(source["code"]))
        for field, value in source.items():
            if field in {"threshold", "monitor_period_weeks"}:
                continue
            if getattr(kpi, field) != value:
                setattr(kpi, field, value)
                changed = True

    missing = [KpiDefinition(**kpi) for kpi in DEFAULT_KPIS if str(kpi["code"]) not in matched_codes]
    if missing:
        db.add_all(missing)
        changed = True

    if changed:
        db.commit()


def _sync_health_dimensions(db: Session) -> None:
    existing = {dimension.name: dimension for dimension in db.scalars(select(HealthDimension))}
    dimensions = sorted({str(kpi["health_dimension"]) for kpi in DEFAULT_KPIS})
    changed = False

    for name in dimensions:
        score_percent = HEALTH_DIMENSION_SCORE_DEFAULTS.get(name)
        if name not in existing:
            db.add(
                HealthDimension(
                    name=name,
                    description=f"{name} KPI health dimension",
                    score_percent=score_percent,
                )
            )
            changed = True
            continue

        dimension = existing[name]
        if not dimension.is_active:
            dimension.is_active = True
            changed = True
        if dimension.score_percent is None and score_percent is not None:
            dimension.score_percent = score_percent
            changed = True

    if changed:
        db.commit()


def _sync_project_phases(db: Session, project_id: int) -> None:
    existing = {
        phase.name: phase
        for phase in db.scalars(select(ProjectPhase).where(ProjectPhase.project_id == project_id))
    }
    catalog_phases = [phase for phase in PHASE_ORDER if phase in {str(kpi["phase"]) for kpi in DEFAULT_KPIS}]
    changed = False

    for index, name in enumerate(catalog_phases, start=1):
        start_date, end_date = PHASE_DATE_DEFAULTS.get(name, (None, None))
        if name not in existing:
            db.add(
                ProjectPhase(
                    project_id=project_id,
                    name=name,
                    sort_order=index,
                    start_date=date.fromisoformat(start_date) if start_date else None,
                    end_date=date.fromisoformat(end_date) if end_date else None,
                    is_active=True,
                )
            )
            changed = True
        else:
            phase = existing[name]
            if phase.sort_order != index or not phase.is_active:
                phase.sort_order = index
                phase.is_active = True
                changed = True
            if phase.start_date is None and start_date:
                phase.start_date = date.fromisoformat(start_date)
                changed = True
            if phase.end_date is None and end_date:
                phase.end_date = date.fromisoformat(end_date)
                changed = True

    if changed:
        db.commit()


def _backfill_formula_components(db: Session) -> None:
    by_code = {kpi["code"]: kpi["formula_components"] for kpi in DEFAULT_KPIS}
    existing = list(db.scalars(select(KpiDefinition)))
    changed = False
    for kpi in existing:
        if not kpi.formula_components and kpi.code in by_code:
            kpi.formula_components = by_code[kpi.code]
            changed = True
    if changed:
        db.commit()


def _insert_missing_kpis(db: Session) -> None:
    existing_codes = set(db.scalars(select(KpiDefinition.code)))
    missing = [KpiDefinition(**kpi) for kpi in DEFAULT_KPIS if kpi["code"] not in existing_codes]
    if missing:
        db.add_all(missing)
        db.commit()


def _component_values_for_seed(kpi: KpiDefinition, value: float) -> dict[str, float]:
    components = kpi.formula_components or []
    numerator = next((component for component in components if component.get("role") == "numerator"), None)
    denominator = next((component for component in components if component.get("role") == "denominator"), None)

    if numerator and denominator:
        denominator_value = 100.0
        return {
            numerator["key"]: round(value * denominator_value, 2),
            denominator["key"]: denominator_value,
        }

    if components:
        return {components[0]["key"]: value}

    return {}
