import { useEffect, useMemo, useState } from "react";

import { apiGet } from "../../lib/api/client";

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
    metric: string;
    threshold: number | null;
    has_threshold_breach: boolean;
    last_values: Array<{
      week_start: string;
      value: number;
      status: "red" | "green";
    }>;
  }>;
};

type HeatmapResponse = {
  project_id: number;
  project_name: string;
  mode: "latest" | "project_to_date";
  week_start: string | null;
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

function cellTone(cell?: HeatmapCell) {
  if (!cell || cell.total_count === 0) {
    return "heatmap-empty";
  }
  return cell.has_monitor_breach ? "heatmap-red" : "heatmap-green";
}

function formatWeek(weekStart: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(`${weekStart}T00:00:00`));
}

function scoreCellValue(cell?: HeatmapCell) {
  if (!cell || cell.total_count === 0) {
    return 1;
  }
  return cell.has_threshold_breach ? 0 : 1;
}

function scoreCellTone(cell?: HeatmapCell) {
  if (!cell || cell.total_count === 0) {
    return "heatmap-empty score-value-cell";
  }
  return cell.has_threshold_breach ? "heatmap-red score-value-cell" : "heatmap-green score-value-cell";
}

export function HeatmapPage() {
  const [mode, setMode] = useState<"latest" | "project_to_date">("latest");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [heatmap, setHeatmap] = useState<HeatmapResponse | null>(null);
  const [dimensionConfig, setDimensionConfig] = useState<HealthDimensionConfig[]>([]);

  useEffect(() => {
    const params = new URLSearchParams({ mode });
    if (mode === "latest" && selectedWeek) {
      params.set("week_start", selectedWeek);
    }
    Promise.all([
      apiGet<HeatmapResponse>(`/api/v1/dashboard/projects/1/heatmap?${params.toString()}`),
      apiGet<HealthDimensionConfig[]>("/api/v1/health-dimensions/?active_only=true"),
    ]).then(([data, dimensions]) => {
      setHeatmap(data);
      setDimensionConfig(dimensions);
      if (!selectedWeek && data.week_start) {
        setSelectedWeek(data.week_start);
      }
    });
  }, [mode, selectedWeek]);

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

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>Weighted threshold score</p>
          <h2>Score heatmap</h2>
          <small className="heatmap-note">
            Based on weekly input, the dashboard looks into the last x weeks as per the configured monitor period. If the threshold is breached continuously, it will be shown in the heatmap.
          </small>
        </div>
        <div className="heatmap-heading-actions">
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
          <div className="heatmap-controls">
            <select value={mode} onChange={(event) => setMode(event.target.value as "latest" | "project_to_date")}>
              <option value="latest">Current / latest week</option>
              <option value="project_to_date">From start of project</option>
            </select>
            <input
              disabled={mode === "project_to_date"}
              type="date"
              value={selectedWeek}
              onChange={(event) => setSelectedWeek(event.target.value)}
            />
          </div>
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
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="trend-heatmap-section">
        <div className="score-heatmap-header">
          <div>
            <p>Phase x health dimension</p>
            <h3>Trend heatmap</h3>
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
                                    {formatWeek(point.week_start)}: {point.value}
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
    </section>
  );
}
