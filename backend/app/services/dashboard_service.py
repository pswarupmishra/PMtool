from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.health_dimension import HealthDimension
from app.models.kpi import KpiDefinition
from app.models.project import Project
from app.models.project_phase import ProjectPhase
from app.models.weekly_kpi_entry import WeeklyKpiEntry
from app.schemas.dashboard import (
    DimensionHealthRead,
    HeatmapCellRead,
    HeatmapKpiRead,
    HeatmapKpiScoreRead,
    HeatmapKpiValueRead,
    KpiHealthRead,
    KpiTrendPoint,
    ProjectHeatmapRead,
    ProjectHealthRead,
    ScoreTrendPointRead,
)

HeatmapPoint = tuple[date, float, str, Optional[str]]


def get_project_health(db: Session, project_id: int) -> ProjectHealthRead:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    entries = list(
        db.scalars(
            select(WeeklyKpiEntry)
            .join(KpiDefinition)
            .where(
                WeeklyKpiEntry.project_id == project_id,
                KpiDefinition.is_active.is_(True),
            )
            .order_by(WeeklyKpiEntry.kpi_id, WeeklyKpiEntry.week_start)
        )
    )


def get_project_heatmap(
    db: Session,
    project_id: int,
    mode: str = "latest",
    week_start: Optional[str] = None,
    period_mode: str = "entire",
    start_week: Optional[str] = None,
    end_week: Optional[str] = None,
) -> ProjectHeatmapRead:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if mode not in {"latest", "project_to_date"}:
        raise HTTPException(status_code=400, detail="Mode must be latest or project_to_date")
    if period_mode not in {"entire", "range"}:
        raise HTTPException(status_code=400, detail="Period mode must be entire or range")

    active_kpis = list(db.scalars(select(KpiDefinition).where(KpiDefinition.is_active.is_(True))))
    entries = list(
        db.scalars(
            select(WeeklyKpiEntry)
            .join(KpiDefinition)
            .where(
                WeeklyKpiEntry.project_id == project_id,
                KpiDefinition.is_active.is_(True),
            )
            .order_by(WeeklyKpiEntry.kpi_id, WeeklyKpiEntry.week_start)
        )
    )
    latest_week = max((entry.week_start for entry in entries), default=date(2026, 7, 13))
    selected_week = latest_week
    if week_start:
        selected_week = date.fromisoformat(week_start)
    range_start = date.fromisoformat(start_week) if start_week else None
    range_end = date.fromisoformat(end_week) if end_week else None
    if period_mode == "range":
        if range_start is None or range_end is None:
            raise HTTPException(status_code=400, detail="Start week and end week are required for range mode")
        if range_start > range_end:
            raise HTTPException(status_code=400, detail="Start week must be before or equal to end week")

    phases = [
        phase.name
        for phase in db.scalars(
            select(ProjectPhase)
            .where(ProjectPhase.project_id == project_id, ProjectPhase.is_active.is_(True))
            .order_by(ProjectPhase.sort_order, ProjectPhase.name)
        )
    ]
    if not phases:
        phases = sorted({kpi.phase for kpi in active_kpis})
    preferred_dimensions = [
        "User Engagement Index",
        "Dependency Fulfillment Index",
        "Delivery Predictability",
        "Scope Stability",
        "Complexity Variance",
        "Quality Index",
        "Flow Efficiency",
    ]
    active_dimension_rows = list(
        db.scalars(
            select(HealthDimension)
            .where(HealthDimension.is_active.is_(True))
            .order_by(HealthDimension.name)
        )
    )
    active_dimensions = [dimension.name for dimension in active_dimension_rows]
    health_dimension_scores = {
        dimension.name: float(dimension.score_percent or 0)
        for dimension in active_dimension_rows
    }
    dimensions = [dimension for dimension in preferred_dimensions if dimension in active_dimensions]
    dimensions.extend(dimension for dimension in active_dimensions if dimension not in dimensions)

    buckets: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {"good": 0, "bad": 0, "total": 0, "monitored": 0, "monitor_breach": 0, "threshold_breach": 0}
    )
    bucket_kpis: dict[tuple[str, str], list[HeatmapKpiRead]] = defaultdict(list)
    by_kpi: dict[int, list[WeeklyKpiEntry]] = defaultdict(list)
    for entry in entries:
        by_kpi[entry.kpi_id].append(entry)
    fallback_weeks = [date(2026, 6, 22), date(2026, 6, 29), date(2026, 7, 6), date(2026, 7, 13)]
    all_weeks = sorted({entry.week_start for entry in entries}) or fallback_weeks
    score_weeks = _filter_weeks_for_period(all_weeks, period_mode, range_start, range_end)

    for kpi in active_kpis:
        bucket = buckets[(kpi.phase, kpi.health_dimension)]
        bucket["total"] += 1
        points = _filter_points_for_period(
            _heatmap_points_for_kpi(kpi, by_kpi.get(kpi.id, [])),
            period_mode,
            range_start,
            range_end,
        )
        has_threshold_breach = _has_threshold_breach(kpi, points, period_mode)
        bucket_kpis[(kpi.phase, kpi.health_dimension)].append(
            _build_heatmap_kpi(kpi, points, has_threshold_breach, score_weeks)
        )
        if kpi.threshold is not None:
            bucket["monitored"] += 1
            if has_threshold_breach:
                bucket["threshold_breach"] += 1
            if _has_monitor_breach(kpi, points):
                bucket["monitor_breach"] += 1

        applicable_points = [point for point in points if point[2] == "applicable"]
        for index, point in enumerate(applicable_points):
            prior = applicable_points[index - 1] if index > 0 else None
            if prior is None:
                continue

            status = _trend_status(kpi.expected_trend, point[1], prior[1] if prior else None)
            if status == "green":
                bucket["good"] += 1
            else:
                bucket["bad"] += 1

    cells = []
    for phase in phases:
        for dimension in dimensions:
            counts = buckets[(phase, dimension)]
            total = counts["total"]
            cells.append(
                HeatmapCellRead(
                    phase=phase,
                    health_dimension=dimension,
                    good_count=counts["good"],
                    bad_count=counts["bad"],
                    total_count=total,
                    good_percent=round((counts["good"] / total) * 100, 1) if total else 0,
                    bad_percent=round((counts["bad"] / total) * 100, 1) if total else 0,
                    monitored_count=counts["monitored"],
                    monitor_breach_count=counts["monitor_breach"],
                    has_monitor_breach=counts["monitor_breach"] > 0,
                    threshold_breach_count=counts["threshold_breach"],
                    has_threshold_breach=counts["threshold_breach"] > 0,
                    kpis=bucket_kpis[(phase, dimension)],
                )
            )

    return ProjectHeatmapRead(
        project_id=project.id,
        project_name=project.name,
        mode=mode,
        week_start=selected_week,
        period_mode=period_mode,
        start_week=range_start,
        end_week=range_end,
        phases=phases,
        health_dimensions=dimensions,
        health_dimension_scores=health_dimension_scores,
        score_trend=_build_score_trend(
            active_kpis,
            by_kpi,
            phases,
            dimensions,
            health_dimension_scores,
            period_mode,
            range_start,
            range_end,
        ),
        cells=cells,
    )

    by_kpi: dict[int, list[WeeklyKpiEntry]] = defaultdict(list)
    for entry in entries:
        by_kpi[entry.kpi_id].append(entry)

    latest_week = max((entry.week_start for entry in entries), default=None)
    kpi_health = [_build_kpi_health(values) for values in by_kpi.values()]
    latest_kpi_health = [kpi for kpi in kpi_health if latest_week and kpi.trend[-1].week_start == latest_week]

    total_weight = sum(kpi.weight for kpi in latest_kpi_health)
    green_weight = sum(kpi.weight for kpi in latest_kpi_health if kpi.status == "green")
    health_score = round((green_weight / total_weight) * 100, 1) if total_weight else 0

    dimensions = _build_dimension_health(latest_kpi_health)

    return ProjectHealthRead(
        project_id=project.id,
        project_name=project.name,
        owner=project.owner,
        week_start=latest_week,
        health_score=health_score,
        health_status=_status_from_score(health_score),
        total_weight=total_weight,
        green_weight=green_weight,
        red_count=sum(1 for kpi in latest_kpi_health if kpi.status == "red"),
        green_count=sum(1 for kpi in latest_kpi_health if kpi.status == "green"),
        dimensions=dimensions,
        kpis=latest_kpi_health,
    )


def _build_kpi_health(entries: list[WeeklyKpiEntry]) -> KpiHealthRead:
    latest = entries[-1]
    previous = entries[-2] if len(entries) > 1 else None
    kpi = latest.kpi
    if kpi is None:
        raise HTTPException(status_code=500, detail="KPI relationship missing")

    trend_points = []
    for index, entry in enumerate(entries):
        prior = entries[index - 1] if index > 0 else None
        trend_points.append(
            KpiTrendPoint(
                week_start=entry.week_start,
                value=entry.value,
                previous_value=prior.value if prior else None,
                status="grey" if entry.applicability_status == "not_relevant" else _trend_status(kpi.expected_trend, entry.value, prior.value if prior else None),
                delta=round(entry.value - prior.value, 4) if prior else None,
                applicability_status=entry.applicability_status,
                applicability_reason=entry.applicability_reason,
            )
        )

    return KpiHealthRead(
        kpi_id=kpi.id,
        code=kpi.code,
        metric=kpi.metric,
        category=kpi.category,
        phase=kpi.phase,
        health_dimension=kpi.health_dimension,
        expected_trend=kpi.expected_trend,
        weight=kpi.weight,
        latest_value=latest.value,
        previous_value=previous.value if previous else None,
        delta=round(latest.value - previous.value, 4) if previous else None,
        status=trend_points[-1].status,
        trend=trend_points,
    )


def _trend_status(expected_trend: str, value: float, previous_value: Optional[float]) -> str:
    if previous_value is None:
        return "green"
    if expected_trend == "positive":
        return "green" if value >= previous_value else "red"
    if expected_trend == "negative":
        return "green" if value <= previous_value else "red"
    return "green" if value == previous_value else "red"


def _threshold_breached(kpi: KpiDefinition, value: float) -> bool:
    if kpi.threshold is None:
        return False
    if kpi.expected_trend == "positive":
        return value < kpi.threshold
    if kpi.expected_trend == "negative":
        return value > kpi.threshold
    return value != kpi.threshold


def _heatmap_points_for_kpi(
    kpi: KpiDefinition,
    entries: list[WeeklyKpiEntry],
) -> list[HeatmapPoint]:
    if entries:
        return [
            (
                entry.week_start,
                entry.value,
                entry.applicability_status or "applicable",
                entry.applicability_reason,
            )
            for entry in sorted(entries, key=lambda entry: entry.week_start)
        ]

    values = [18, 15, 13, 11] if kpi.expected_trend == "negative" else [62, 70, 78, 84]
    weeks = [date(2026, 6, 22), date(2026, 6, 29), date(2026, 7, 6), date(2026, 7, 13)]
    return [(week, value, "applicable", None) for week, value in zip(weeks, values)]


def _filter_weeks_for_period(
    weeks: list[date],
    period_mode: str,
    start_week: Optional[date],
    end_week: Optional[date],
) -> list[date]:
    if period_mode != "range":
        return weeks
    return [week for week in weeks if (start_week is None or week >= start_week) and (end_week is None or week <= end_week)]


def _filter_points_for_period(
    points: list[HeatmapPoint],
    period_mode: str,
    start_week: Optional[date],
    end_week: Optional[date],
) -> list[HeatmapPoint]:
    return [
        point
        for point in points
        if period_mode != "range" or (
            (start_week is None or point[0] >= start_week) and (end_week is None or point[0] <= end_week)
        )
    ]


def _display_value_for_kpi(kpi: KpiDefinition, value: float) -> float:
    has_ratio_formula = any(
        component.get("role") == "numerator"
        for component in kpi.formula_components or []
    ) and any(
        component.get("role") == "denominator"
        for component in kpi.formula_components or []
    )
    return round(value * 100, 1) if has_ratio_formula and abs(value) <= 1 else value


def _build_heatmap_kpi(
    kpi: KpiDefinition,
    points: list[HeatmapPoint],
    has_threshold_breach: bool,
    score_weeks: list[date],
) -> HeatmapKpiRead:
    points_by_week = {week_start: (value, applicability_status, reason) for week_start, value, applicability_status, reason in points}

    return HeatmapKpiRead(
        code=kpi.code,
        category=kpi.category,
        metric=kpi.metric,
        expected_trend=kpi.expected_trend,
        monitor_period_weeks=kpi.monitor_period_weeks,
        threshold=kpi.threshold,
        has_threshold_breach=has_threshold_breach,
        trend_values=[
            HeatmapKpiValueRead(
                week_start=week_start,
                value=value,
                display_value=_display_value_for_kpi(kpi, value),
                status="grey" if applicability_status == "not_relevant" else ("red" if _threshold_breached(kpi, value) else "green"),
                applicability_status=applicability_status,
                applicability_reason=reason,
            )
            for week_start, value, applicability_status, reason in points
        ],
        last_values=[
            HeatmapKpiValueRead(
                week_start=week_start,
                value=value,
                display_value=_display_value_for_kpi(kpi, value),
                status="grey" if applicability_status == "not_relevant" else ("red" if _threshold_breached(kpi, value) else "green"),
                applicability_status=applicability_status,
                applicability_reason=reason,
            )
            for week_start, value, applicability_status, reason in points[-3:]
        ],
        score_values=[
            HeatmapKpiScoreRead(
                week_start=week_start,
                score=None if week_start not in points_by_week or points_by_week[week_start][1] == "not_relevant" else (
                    0 if _threshold_breached(kpi, points_by_week[week_start][0]) else 1
                ),
                status="grey" if week_start not in points_by_week or points_by_week[week_start][1] == "not_relevant" else (
                    "red" if _threshold_breached(kpi, points_by_week[week_start][0]) else "green"
                ),
            )
            for week_start in score_weeks
        ],
    )


def _has_monitor_breach(
    kpi: KpiDefinition,
    points: list[HeatmapPoint],
) -> bool:
    if kpi.threshold is None:
        return False

    monitor_period = kpi.monitor_period_weeks or 3
    if monitor_period <= 0:
        return False

    ordered_points = sorted(points, key=lambda point: point[0])
    if len(ordered_points) < monitor_period:
        return False

    for index in range(monitor_period, len(ordered_points) + 1):
        window = ordered_points[index - monitor_period:index]
        if all(point[2] == "applicable" and _threshold_breached(kpi, point[1]) for point in window):
            return True
    return False


def _has_threshold_breach(
    kpi: KpiDefinition,
    points: list[HeatmapPoint],
    period_mode: str,
) -> bool:
    if kpi.threshold is None:
        return False

    ordered_points = sorted(points, key=lambda point: point[0])
    if not ordered_points:
        return False
    return any(point[2] == "applicable" and _threshold_breached(kpi, point[1]) for point in ordered_points)


def _build_score_trend(
    kpis: list[KpiDefinition],
    by_kpi: dict[int, list[WeeklyKpiEntry]],
    phases: list[str],
    dimensions: list[str],
    dimension_scores: dict[str, float],
    period_mode: str,
    start_week: Optional[date],
    end_week: Optional[date],
) -> list[ScoreTrendPointRead]:
    kpi_points = {
        kpi.id: _filter_points_for_period(
            _heatmap_points_for_kpi(kpi, by_kpi.get(kpi.id, [])),
            period_mode,
            start_week,
            end_week,
        )
        for kpi in kpis
    }
    weeks = sorted({week_start for points in kpi_points.values() for week_start, *_ in points})
    if not weeks:
        return []

    kpis_by_bucket: dict[tuple[str, str], list[KpiDefinition]] = defaultdict(list)
    for kpi in kpis:
        kpis_by_bucket[(kpi.phase, kpi.health_dimension)].append(kpi)

    trend = []
    for week in weeks:
        score = 0.0
        for phase in phases:
            for dimension in dimensions:
                bucket_kpis = kpis_by_bucket[(phase, dimension)]
                dimension_score = dimension_scores.get(dimension, 0) / 100
                if not bucket_kpis:
                    score += dimension_score
                    continue
                has_breach = any(
                    _has_threshold_breach(
                        kpi,
                        [point for point in kpi_points[kpi.id] if point[0] <= week],
                        "entire",
                    )
                    for kpi in bucket_kpis
                )
                if not has_breach:
                    score += dimension_score
        trend.append(ScoreTrendPointRead(week_start=week, score=round(score, 2)))

    return trend


def _build_dimension_health(kpis: list[KpiHealthRead]) -> list[DimensionHealthRead]:
    dimensions: dict[str, list[KpiHealthRead]] = defaultdict(list)
    for kpi in kpis:
        dimensions[kpi.health_dimension].append(kpi)

    result = []
    for dimension, dimension_kpis in sorted(dimensions.items()):
        total_weight = sum(kpi.weight for kpi in dimension_kpis)
        green_weight = sum(kpi.weight for kpi in dimension_kpis if kpi.status == "green")
        score = round((green_weight / total_weight) * 100, 1) if total_weight else 0
        result.append(
            DimensionHealthRead(
                health_dimension=dimension,
                score=score,
                total_weight=total_weight,
                green_weight=green_weight,
                red_count=sum(1 for kpi in dimension_kpis if kpi.status == "red"),
            )
        )
    return result


def _status_from_score(score: float) -> str:
    if score >= 80:
        return "green"
    if score >= 60:
        return "amber"
    return "red"
