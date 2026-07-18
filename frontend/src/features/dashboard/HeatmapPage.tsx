import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";

import { apiGet } from "../../lib/api/client";
import { Sparkline } from "./Sparkline";
import type { TrendDirection } from "./dashboardData";

type HeatmapCell = {
  phase: string;
  health_dimension: string;
  good_count: number;
  bad_count: number;
  total_count: number;
  good_percent: number;
  bad_percent: number;
  monitored_count: number;
  monitor_breach_count: number;
  has_monitor_breach: boolean;
  threshold_breach_count: number;
  has_threshold_breach: boolean;
  kpis: Array<{
    code: string;
    category: string;
    metric: string;
    expected_trend: TrendDirection;
    monitor_period_weeks: number | null;
    threshold: number | null;
    has_threshold_breach: boolean;
    trend_values: Array<{
      week_start: string;
      value: number;
      display_value: number;
      status: "red" | "green" | "grey";
      applicability_status: "applicable" | "not_relevant";
      applicability_reason: string | null;
    }>;
    last_values: Array<{
      week_start: string;
      value: number;
      display_value: number;
      status: "red" | "green" | "grey";
      applicability_status: "applicable" | "not_relevant";
      applicability_reason: string | null;
    }>;
    score_values: Array<{
      week_start: string;
      score: number | null;
      status: "red" | "green" | "grey";
    }>;
  }>;
};

type HeatmapResponse = {
  project_id: number;
  project_name: string;
  mode: string;
  week_start: string | null;
  period_mode: "entire" | "range";
  start_week: string | null;
  end_week: string | null;
  phases: string[];
  health_dimensions: string[];
  health_dimension_scores: Record<string, number>;
  score_trend: Array<{
    week_start: string;
    score: number;
  }>;
  cells: HeatmapCell[];
};

type HealthDimensionConfig = {
  name: string;
  score_percent: number | null;
  is_active: boolean;
};

type ProjectConfig = {
  id: number;
  name: string;
};

type ProjectPhaseConfig = {
  id: number;
  name: string;
  sort_order: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
};

type WeeklyEntry = {
  id: number;
  project_id: number;
  kpi_id: number;
  week_start: string;
  kpi: {
    id: number;
    code: string;
    phase: string;
  } | null;
};

function cellTone(cell?: HeatmapCell) {
  if (!cell || cell.total_count === 0) {
    return "heatmap-empty";
  }
  return cell.has_monitor_breach ? "heatmap-red" : "heatmap-green";
}

function formatWeek(weekStart: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(`${weekStart}T00:00:00`));
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function firstWednesdayOnOrAfter(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day <= 3 ? 3 - day : 10 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function wednesdayForWeek(value: string) {
  const date = parseDate(value);
  const day = date.getDay();
  const diff = day <= 3 ? 3 - day : 10 - day;
  date.setDate(date.getDate() + diff);
  return formatDate(date);
}

function formatCalendarLabel(dateText: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(parseDate(dateText));
}

function scoreCellValue(cell?: HeatmapCell) {
  if (!cell || cell.total_count === 0) {
    return 1;
  }
  return cell.has_threshold_breach ? 0 : 1;
}

function hasApplicableCellInput(cell?: HeatmapCell) {
  return Boolean(
    cell?.kpis.some((kpi) =>
      (kpi.trend_values ?? []).some((point) => point.applicability_status !== "not_relevant" && point.status !== "grey"),
    ),
  );
}

function scoreCellTone(cell?: HeatmapCell) {
  if (!cell || cell.total_count === 0) {
    return "heatmap-empty score-value-cell";
  }
  if (!hasApplicableCellInput(cell)) {
    return "heatmap-empty score-value-cell";
  }
  return cell.has_threshold_breach ? "heatmap-red score-value-cell" : "heatmap-green score-value-cell";
}

type HeatmapInfoPopupProps = {
  id: "score" | "trend";
  openInfo: "score" | "trend" | null;
  title: string;
  onToggle: (id: "score" | "trend") => void;
  onClose: () => void;
  children: ReactNode;
};

function HeatmapInfoPopup({ children, id, onClose, onToggle, openInfo, title }: HeatmapInfoPopupProps) {
  const isOpen = openInfo === id;
  return (
    <span className="heatmap-info-wrap">
      <button
        aria-expanded={isOpen}
        aria-label={`${title} logic`}
        className="heatmap-info-button"
        onClick={() => onToggle(id)}
        type="button"
      >
        <Info size={16} />
      </button>
      {isOpen ? (
        <div className="heatmap-info-popup" role="dialog" aria-label={`${title} logic`}>
          <div className="heatmap-info-popup-header">
            <strong>{title}</strong>
            <button aria-label="Close heatmap logic" onClick={onClose} type="button">
              <X size={14} />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </span>
  );
}

function directionLabel(direction: TrendDirection) {
  if (direction === "positive") return "Higher";
  if (direction === "negative") return "Lower";
  return "Equal";
}

function actualTrend(points: Array<{ value: number }>): TrendDirection {
  const applicablePoints = points.filter((point) => !("status" in point) || point.status !== "grey");
  if (applicablePoints.length < 2) return "equal";
  const first = applicablePoints[0].value;
  const latest = applicablePoints[applicablePoints.length - 1].value;
  if (latest > first) return "positive";
  if (latest < first) return "negative";
  return "equal";
}

function latestThresholdTone(
  latestValue: number,
  threshold: number | null,
  expectedTrend: TrendDirection,
) {
  if (threshold === null) return null;
  if (expectedTrend === "positive") return Number(latestValue) < Number(threshold) ? "red" : "green";
  if (expectedTrend === "negative") return Number(latestValue) > Number(threshold) ? "red" : "green";
  return Number(latestValue) === Number(threshold) ? "green" : "red";
}

function isThresholdBreached(value: number, threshold: number | null, expectedTrend: TrendDirection) {
  return latestThresholdTone(value, threshold, expectedTrend) === "red";
}

function shouldMonitor(kpi: HeatmapCell["kpis"][number]) {
  const monitorPeriod = kpi.monitor_period_weeks ?? 3;
  const trend = kpi.trend_values ?? [];
  if (kpi.threshold === null || monitorPeriod <= 0 || trend.length < monitorPeriod) {
    return false;
  }

  return trend
    .slice(-monitorPeriod)
    .every((point) =>
      point.applicability_status !== "not_relevant" &&
      point.status !== "grey" &&
      isThresholdBreached(point.value, kpi.threshold, kpi.expected_trend),
    );
}

function phaseAbbreviation(phaseName: string) {
  const knownAbbreviations: Record<string, string> = {
    "Requirement Analysis": "RA",
    "Solution Design": "SD",
    "Sprint Development": "SP",
    Testing: "TE",
    "Deployment Readiness": "DR",
  };
  if (knownAbbreviations[phaseName]) return knownAbbreviations[phaseName];
  const words = phaseName.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

export function HeatmapPage() {
  const [periodMode, setPeriodMode] = useState<"entire" | "range">("entire");
  const [startWeek, setStartWeek] = useState("");
  const [endWeek, setEndWeek] = useState("");
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [dimensionConfig, setDimensionConfig] = useState<HealthDimensionConfig[]>([]);
  const [projectPhases, setProjectPhases] = useState<ProjectPhaseConfig[]>([]);
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyEntry[]>([]);
  const [openInfo, setOpenInfo] = useState<"score" | "trend" | null>(null);
  const [selectedScoreCell, setSelectedScoreCell] = useState<HeatmapCell | null>(null);
  const [activeHeatmapView, setActiveHeatmapView] = useState<"executive" | "pmo">("executive");

  useEffect(() => {
    const params = new URLSearchParams({ period_mode: periodMode, mode: "project_to_date" });
    if (periodMode === "range" && startWeek && endWeek) {
      params.set("start_week", startWeek);
      params.set("end_week", endWeek);
    } else if (periodMode === "range") {
      return;
    }
    Promise.all([
      apiGet<HeatmapResponse>(`/api/v1/dashboard/projects/1/heatmap?${params.toString()}`),
      apiGet<HealthDimensionConfig[]>("/api/v1/health-dimensions/?active_only=true"),
    ]).then(([data, dimensions]) => {
      setHeatmap(data);
      setDimensionConfig(dimensions);
    });
  }, [endWeek, periodMode, startWeek]);

  useEffect(() => {
    apiGet<ProjectConfig[]>("/api/v1/projects/")
      .then(async (projects) => {
        const project = projects[0];
        if (!project) return;
        const [phases, entries] = await Promise.all([
          apiGet<ProjectPhaseConfig[]>(`/api/v1/project-phases/?project_id=${project.id}&active_only=true`),
          apiGet<WeeklyEntry[]>(`/api/v1/weekly-entries/?project_id=${project.id}`),
        ]);
        setProjectPhases(phases.sort((a, b) => a.sort_order - b.sort_order));
        setWeeklyEntries(entries);
      });
  }, []);

  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    heatmap?.cells.forEach((cell) => {
      map.set(`${cell.phase}::${cell.health_dimension}`, cell);
    });
    return map;
  }, [heatmap]);

  const configuredDimensionScores = useMemo(() => {
    const scores = new Map<string, number>();
    dimensionConfig.forEach((dimension) => {
      scores.set(dimension.name, dimension.score_percent ?? 0);
    });
    if (!scores.size) {
      Object.entries(heatmap?.health_dimension_scores ?? {}).forEach(([dimension, score]) => {
        scores.set(dimension, score);
      });
    }
    return scores;
  }, [dimensionConfig, heatmap]);

  const totalScore = useMemo(() => {
    if (!heatmap) {
      return 0;
    }
    return heatmap.phases.reduce((phaseTotal, phase) => {
      const phaseScore = heatmap.health_dimensions.reduce((dimensionTotal, dimension) => {
        const cell = cellMap.get(`${phase}::${dimension}`);
        const dimensionScore = configuredDimensionScores.get(dimension) ?? 0;
        return dimensionTotal + scoreCellValue(cell) * (dimensionScore / 100);
      }, 0);
      return phaseTotal + phaseScore;
    }, 0);
  }, [cellMap, configuredDimensionScores, heatmap]);

  const phaseDateRange = useMemo(() => {
    const dated = projectPhases.filter((phase) => phase.start_date && phase.end_date);
    if (!dated.length) return null;
    const starts = dated.map((phase) => parseDate(phase.start_date as string).getTime());
    const ends = dated.map((phase) => parseDate(phase.end_date as string).getTime());
    return {
      start: new Date(Math.min(...starts)),
      end: new Date(Math.max(...ends)),
    };
  }, [projectPhases]);

  const calendarWeeks = useMemo(() => {
    if (!phaseDateRange) return [];
    const weeks = [];
    const cursor = firstWednesdayOnOrAfter(phaseDateRange.start);
    const end = addMonths(phaseDateRange.end, 9);
    while (cursor <= end) {
      weeks.push(formatDate(cursor));
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [phaseDateRange]);

  const entriesByCalendarWeek = useMemo(() => {
    const map = new Map<string, WeeklyEntry[]>();
    weeklyEntries.forEach((entry) => {
      const calendarWeek = wednesdayForWeek(entry.week_start);
      map.set(calendarWeek, [...(map.get(calendarWeek) ?? []), entry]);
    });
    return map;
  }, [weeklyEntries]);

  useEffect(() => {
    if (!calendarWeeks.length) return;
    if (!startWeek || !calendarWeeks.includes(startWeek)) {
      setStartWeek(calendarWeeks[0]);
    }
    if (!endWeek || !calendarWeeks.includes(endWeek)) {
      setEndWeek(calendarWeeks[calendarWeeks.length - 1]);
    }
  }, [calendarWeeks, endWeek, startWeek]);

  function phaseForWeek(dateText: string) {
    const selected = parseDate(dateText).getTime();
    return projectPhases.find((phase) => {
      if (!phase.start_date || !phase.end_date) return false;
      return selected >= parseDate(phase.start_date).getTime() && selected <= parseDate(phase.end_date).getTime();
    });
  }

  function isBeyondConfiguredPhase(dateText: string) {
    return projectPhases.length > 0 && !phaseForWeek(dateText);
  }

  function isPhaseEntryOutsidePlannedDates(dateText: string, phaseName: string) {
    const selected = parseDate(dateText).getTime();
    const phaseConfig = projectPhases.find((phase) => phase.name === phaseName);
    if (!phaseConfig?.start_date || !phaseConfig.end_date) return false;
    return selected < parseDate(phaseConfig.start_date).getTime() || selected > parseDate(phaseConfig.end_date).getTime();
  }

  function calendarCellClass(dateText: string) {
    const hasData = Boolean(entriesByCalendarWeek.get(dateText)?.length);
    if (!hasData && isBeyondConfiguredPhase(dateText)) {
      return "weekly-calendar-cell weekly-calendar-red";
    }
    return hasData ? "weekly-calendar-cell weekly-calendar-green" : "weekly-calendar-cell weekly-calendar-grey";
  }

  function enteredPhaseBadgesForWeek(dateText: string) {
    const phases = new Set(
      (entriesByCalendarWeek.get(dateText) ?? [])
        .map((entry) => entry.kpi?.phase)
        .filter(Boolean) as string[],
    );
    return Array.from(phases).map((phase) => ({
      name: phase,
      abbreviation: phaseAbbreviation(phase),
      outsidePlan: isPhaseEntryOutsidePlannedDates(dateText, phase),
    }));
  }

  function updateRangeWeek(dateText: string) {
    if (!startWeek || parseDate(dateText).getTime() <= parseDate(startWeek).getTime()) {
      setStartWeek(dateText);
      if (!endWeek || parseDate(dateText).getTime() > parseDate(endWeek).getTime()) {
        setEndWeek(dateText);
      }
      return;
    }
    setEndWeek(dateText);
  }

  function rangeSelectionClass(dateText: string) {
    if (periodMode !== "range" || !startWeek || !endWeek) return "";
    const current = parseDate(dateText).getTime();
    const start = parseDate(startWeek).getTime();
    const end = parseDate(endWeek).getTime();
    if (dateText === startWeek || dateText === endWeek) return " weekly-calendar-selected";
    return current > start && current < end ? " heatmap-calendar-in-range" : "";
  }

  function rangeSummary() {
    if (!startWeek || !endWeek) return "Select the first and last Wednesday";
    return `${formatCalendarLabel(startWeek)} to ${formatCalendarLabel(endWeek)}`;
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>Project health cockpit</p>
          <h2>{activeHeatmapView === "executive" ? "Executive Overview" : "PMO Insights"}</h2>
          <div className="heatmap-view-tabs" role="tablist" aria-label="Heatmap view selector">
            <button
              aria-selected={activeHeatmapView === "executive"}
              className={activeHeatmapView === "executive" ? "heatmap-view-tab heatmap-view-tab-active" : "heatmap-view-tab"}
              onClick={() => setActiveHeatmapView("executive")}
              type="button"
            >
              Executive Overview
            </button>
            <button
              aria-selected={activeHeatmapView === "pmo"}
              className={activeHeatmapView === "pmo" ? "heatmap-view-tab heatmap-view-tab-active" : "heatmap-view-tab"}
              onClick={() => setActiveHeatmapView("pmo")}
              type="button"
            >
              PMO Insights
            </button>
          </div>
        </div>
        <div className="heatmap-heading-actions">
          {activeHeatmapView === "pmo" ? (
            <div className="score-summary-popover" tabIndex={0}>
              <strong className="score-summary-pill">{totalScore.toFixed(2)} / 5</strong>
              <div className="score-trend-popup" role="tooltip">
                <strong>Weekly weighted score</strong>
                <div className="score-trend-bars">
                  {(heatmap?.score_trend ?? []).map((point) => (
                    <div className="score-trend-bar-item" key={point.week_start}>
                      <div className="score-trend-bar-track">
                        <span style={{ height: `${Math.max(4, Math.min(100, (point.score / 5) * 100))}%` }} />
                      </div>
                      <small>{formatWeek(point.week_start)}</small>
                      <b>{point.score.toFixed(2)}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <div className="heatmap-controls">
            <select value={periodMode} onChange={(event) => setPeriodMode(event.target.value as "entire" | "range")}>
              <option value="entire">Entire project</option>
              <option value="range">Between two weeks</option>
            </select>
          </div>
        </div>
      </div>

      {periodMode === "range" ? (
        <div className="weekly-calendar-panel heatmap-week-selector">
          <div className="weekly-calendar-heading">
            <div>
              <strong>Week range</strong>
              <span>{rangeSummary()}</span>
            </div>
            <div className="weekly-calendar-legend">
              <span><b className="legend-dot legend-green" />Data available</span>
              <span><b className="legend-dot weekly-legend-grey" />No data</span>
              <span><b className="legend-dot legend-red" />Outside phase plan</span>
            </div>
          </div>
          <div className="weekly-calendar-grid">
            {calendarWeeks.map((dateText) => {
              const badges = enteredPhaseBadgesForWeek(dateText);
              return (
                <button
                  className={`${calendarCellClass(dateText)}${rangeSelectionClass(dateText)}`}
                  key={dateText}
                  onClick={() => updateRangeWeek(dateText)}
                  type="button"
                >
                  <strong>{formatCalendarLabel(dateText)}</strong>
                  <span>Wed</span>
                  <small className="weekly-phase-badges">
                    {badges.map((badge) => (
                      <b
                        className={`weekly-phase-badge ${badge.outsidePlan ? "weekly-phase-badge-red" : "weekly-phase-badge-green"}`}
                        key={`${dateText}-${badge.name}`}
                        title={badge.name}
                      >
                        {badge.abbreviation}
                      </b>
                    ))}
                  </small>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {activeHeatmapView === "pmo" ? (
        <>
          <div className="score-heatmap-header">
            <div>
              <p>Weighted threshold score</p>
              <div className="heatmap-title-row">
                <h3>Score heatmap</h3>
                <HeatmapInfoPopup
                  id="score"
                  onClose={() => setOpenInfo(null)}
                  onToggle={(infoId) => setOpenInfo((current) => current === infoId ? null : infoId)}
                  openInfo={openInfo}
                  title="Score heatmap logic"
                >
                  <p>
                    This view converts project health into a simple score out of 5, one point for each configured project phase.
                  </p>
                  <ul>
                    <li>Each phase is scored across the configured health dimensions.</li>
                    <li>Dimension weights come from the Configuration page Score % field.</li>
                    <li>If any KPI in a cell breaches its threshold, that cell contributes 0 for that dimension.</li>
                    <li>If no KPI breaches the threshold, the cell contributes its configured weight.</li>
                    <li>If no KPI is configured for a cell, it is treated as neutral/pass and shown in grey.</li>
                  </ul>
                </HeatmapInfoPopup>
              </div>
              <small className="heatmap-note">
                Based on weekly input, the dashboard looks into the last x weeks as per the configured monitor period. If the threshold is breached continuously, it will be shown in the heatmap.
              </small>
            </div>
          </div>

          <div className="heatmap-wrap">
            <table className="heatmap-table score-heatmap-table">
              <thead>
                <tr>
                  <th>Phase</th>
                  {heatmap?.health_dimensions.map((dimension) => (
                    <th key={dimension}>
                      {dimension}
                      <small>{configuredDimensionScores.get(dimension) ?? 0}%</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmap?.phases.map((phase) => (
                  <tr key={phase}>
                    <th>{phase}</th>
                    {heatmap.health_dimensions.map((dimension) => {
                      const cell = cellMap.get(`${phase}::${dimension}`);
                      return (
                        <td
                          aria-label={`${phase} ${dimension} score status`}
                          className={scoreCellTone(cell)}
                          key={`${phase}-${dimension}-score`}
                          title={
                            !cell || cell.total_count === 0
                              ? "No KPIs configured"
                              : cell.has_threshold_breach
                                ? "Threshold breached"
                                : "Healthy"
                          }
                        >
                          {cell && cell.total_count > 0 ? (
                            <>
                              <button
                                className="score-cell-trend-link"
                                onClick={() => setSelectedScoreCell(cell)}
                                type="button"
                              >
                                Trend
                              </button>
                              <div className="score-cell-metrics">
                                {(cell.kpis ?? []).map((kpi) => (
                                  <span
                                    className={kpi.has_threshold_breach ? "score-cell-metric-breached" : undefined}
                                    key={`${phase}-${dimension}-${kpi.metric}`}
                                  >
                                    {kpi.metric}
                                  </span>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {selectedScoreCell ? (
        <div className="kpi-score-modal-backdrop" role="presentation">
          <div className="kpi-score-modal kpi-health-drilldown-modal" role="dialog" aria-label="KPI health drilldown">
            <div className="kpi-score-modal-header">
              <div>
                <p>KPI health drill-down</p>
                <strong>{selectedScoreCell.phase} | {selectedScoreCell.health_dimension}</strong>
              </div>
              <button aria-label="Close KPI health drill-down" onClick={() => setSelectedScoreCell(null)} type="button">
                <X size={16} />
              </button>
            </div>
            <div className="kpi-score-modal-note">
              Showing KPI Health data filtered to the selected phase and health dimension.
            </div>
            <div className="kpi-health-summary kpi-health-drilldown-summary">
              <div className="metric-card metric-card-blue">
                <span>Filtered KPIs</span>
                <strong>{selectedScoreCell.kpis.length}</strong>
                <small>{selectedScoreCell.phase}</small>
              </div>
              <div className="metric-card metric-card-green">
                <span>Green latest trend</span>
                <strong>{selectedScoreCell.kpis.filter((kpi) => (kpi.trend_values[kpi.trend_values.length - 1]?.status ?? "green") === "green").length}</strong>
                <small>Latest week status</small>
              </div>
              <div className={selectedScoreCell.kpis.some((kpi) => (kpi.trend_values[kpi.trend_values.length - 1]?.status ?? "green") === "red") ? "metric-card metric-card-red" : "metric-card metric-card-green"}>
                <span>Red latest trend</span>
                <strong>{selectedScoreCell.kpis.filter((kpi) => (kpi.trend_values[kpi.trend_values.length - 1]?.status ?? "green") === "red").length}</strong>
                <small>Requires attention</small>
              </div>
            </div>
            <div className="kpi-table-wrap kpi-health-drilldown-table">
              <table className="kpi-table">
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>Expected</th>
                    <th>Actual</th>
                    <th>Threshold</th>
                    <th>Weekly Value</th>
                    <th>Latest</th>
                    <th>Monitor</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedScoreCell.kpis.map((kpi) => {
                    const trend = (kpi.trend_values ?? []).map((point) => ({
                      week: formatWeek(point.week_start),
                      value: point.display_value,
                      status: point.status,
                      applicabilityStatus: point.applicability_status,
                      applicabilityReason: point.applicability_reason,
                    }));
                    const rawTrend = kpi.trend_values ?? [];
                    const latest = trend[trend.length - 1];
                    const latestRaw = rawTrend[rawTrend.length - 1];
                    const actual = actualTrend(trend);
                    const isNotRelevant = latestRaw?.applicability_status === "not_relevant" || latest?.status === "grey";
                    const thresholdTone = latestRaw && !isNotRelevant
                      ? latestThresholdTone(latestRaw.value, kpi.threshold, kpi.expected_trend)
                      : null;
                    const latestTone = thresholdTone ?? latest?.status ?? "green";
                    const monitor = shouldMonitor(kpi);
                    return (
                      <tr key={kpi.code}>
                        <td>
                          <strong>{kpi.metric}</strong>
                          <span>{kpi.category}</span>
                        </td>
                        <td>{directionLabel(kpi.expected_trend)}</td>
                        <td>
                          <span className={actual === kpi.expected_trend ? "actual-trend actual-trend-match" : "actual-trend actual-trend-mismatch"}>
                            {directionLabel(actual)}
                          </span>
                        </td>
                        <td>{kpi.threshold ?? "-"}</td>
                        <td>
                          {trend.length ? (
                            <Sparkline expectedTrend={kpi.expected_trend} points={trend} threshold={kpi.threshold} usePointStatus />
                          ) : "-"}
                        </td>
                        <td className={thresholdTone ? `latest-value-cell latest-value-cell-${thresholdTone}` : "latest-value-cell"}>
                          {latest ? (
                            <div className="latest-value-wrap">
                              <span className={`status-pill status-pill-${latestTone}`}>{isNotRelevant ? "N/A" : latest.value}</span>
                              <small>Week of {latest.week}</small>
                              {isNotRelevant && latest.applicabilityReason ? <small>{latest.applicabilityReason}</small> : null}
                            </div>
                          ) : "-"}
                        </td>
                        <td>
                          <span className={monitor ? "monitor-pill monitor-pill-yes" : "monitor-pill monitor-pill-no"}>
                            {monitor ? "Yes" : "No"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeHeatmapView === "executive" ? (
      <div className="trend-heatmap-section">
        <div className="score-heatmap-header">
          <div>
            <p>Phase x health dimension</p>
            <div className="heatmap-title-row">
              <h3>Trend heatmap</h3>
              <HeatmapInfoPopup
                id="trend"
                onClose={() => setOpenInfo(null)}
                onToggle={(infoId) => setOpenInfo((current) => current === infoId ? null : infoId)}
                openInfo={openInfo}
                title="Trend heatmap logic"
              >
                <p>
                  This view highlights where KPI performance has crossed a threshold for a sustained period.
                </p>
                <ul>
                  <li>The dashboard reads the weekly KPI inputs for each phase and health dimension.</li>
                  <li>Each KPI has a configured threshold and monitor period in weeks.</li>
                  <li>A cell turns red only when a KPI breaches its threshold continuously for the configured monitor period.</li>
                  <li>A green cell means no continuous threshold breach is currently detected.</li>
                  <li>The cell count shows how many KPIs are in breach compared with the total KPIs in that cell.</li>
                </ul>
              </HeatmapInfoPopup>
            </div>
            <small className="heatmap-note">
              Based on weekly input, the dashboard looks into the last x weeks as per the configured monitor period. If the threshold is breached continuously, it will be shown in the heatmap.
            </small>
          </div>
        </div>

        <div className="heatmap-legend">
          <span><b className="legend-dot legend-green" />No continuous threshold breach</span>
          <span><b className="legend-dot legend-red" />Continuous threshold breach</span>
        </div>

        <div className="heatmap-wrap">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Phase</th>
                {heatmap?.health_dimensions.map((dimension) => (
                  <th key={dimension}>{dimension}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap?.phases.map((phase) => (
                <tr key={phase}>
                <th>{phase}</th>
                {heatmap.health_dimensions.map((dimension) => {
                  const cell = cellMap.get(`${phase}::${dimension}`);
                  return (
                    <td className={cellTone(cell)} key={`${phase}-${dimension}`}>
                      <strong>{cell?.monitor_breach_count ?? 0}/{cell?.total_count ?? 0}</strong>
                      <span>{cell?.has_monitor_breach ? "Monitor breach" : "No monitor breach"}</span>
                      <small>{cell?.total_count ?? 0} KPIs</small>
                      {cell && (cell.kpis ?? []).length ? (
                        <div className="heatmap-tooltip" role="tooltip">
                          {(cell.kpis ?? []).map((kpi) => (
                            <div className="heatmap-tooltip-row" key={kpi.metric}>
                              <strong>{kpi.metric}</strong>
                              <span>Threshold: {kpi.threshold ?? "-"}</span>
                              <div className="heatmap-tooltip-values">
                                {kpi.last_values.map((point) => (
                                  <span key={`${kpi.metric}-${point.week_start}`}>
                                    <b className={`tooltip-status-dot tooltip-status-dot-${point.status}`} />
                                    {formatWeek(point.week_start)}: {point.status === "grey" ? "N/A" : point.display_value}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : null}
    </section>
  );
}
