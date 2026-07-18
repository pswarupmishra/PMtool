import { useMemo, useState } from "react";

import { MetricCard } from "../../components/ui/MetricCard";
import { phaseOrder, type KpiDefinition } from "./dashboardData";
import { Sparkline } from "./Sparkline";

type KpiHealthPageProps = {
  kpis: KpiDefinition[];
  phaseConfigs: Array<{ name: string; end_date: string | null }>;
  weekStart: string;
};

function directionLabel(direction: KpiDefinition["expectedTrend"]) {
  if (direction === "positive") return "Higher";
  if (direction === "negative") return "Lower";
  return "Equal";
}

function actualTrend(points: KpiDefinition["trend"]): KpiDefinition["expectedTrend"] {
  if (points.length < 2) return "equal";
  const first = points[0].value;
  const latest = points[points.length - 1].value;
  if (latest > first) return "positive";
  if (latest < first) return "negative";
  return "equal";
}

function latestThresholdTone(
  latestValue: number,
  threshold: number | null,
  expectedTrend: KpiDefinition["expectedTrend"],
) {
  if (threshold === null) return null;
  if (expectedTrend === "positive") return Number(latestValue) < Number(threshold) ? "red" : "green";
  if (expectedTrend === "negative") return Number(latestValue) > Number(threshold) ? "red" : "green";
  return Number(latestValue) === Number(threshold) ? "green" : "red";
}

function isThresholdBreached(
  value: number,
  threshold: number | null,
  expectedTrend: KpiDefinition["expectedTrend"],
) {
  return latestThresholdTone(value, threshold, expectedTrend) === "red";
}

function shouldMonitor(kpi: KpiDefinition) {
  const monitorPeriod = kpi.monitorPeriodWeeks ?? 3;
  if (kpi.threshold === null || monitorPeriod <= 0 || kpi.trend.length < monitorPeriod) {
    return false;
  }

  return kpi.trend
    .slice(-monitorPeriod)
    .every((point) => isThresholdBreached(point.value, kpi.threshold, kpi.expectedTrend));
}

function isPhaseOverdue(phase: string, weekStart: string, phaseConfigs: KpiHealthPageProps["phaseConfigs"]) {
  const phaseConfig = phaseConfigs.find((item) => item.name === phase);
  if (!phaseConfig?.end_date || !weekStart) return false;
  return new Date(`${weekStart}T00:00:00`) > new Date(`${phaseConfig.end_date}T00:00:00`);
}

export function KpiHealthPage({ kpis, phaseConfigs, weekStart }: KpiHealthPageProps) {
  const phases = useMemo(() => Array.from(new Set(kpis.map((kpi) => kpi.phase))), [kpis]);
  const visiblePhases = useMemo(() => {
    const ordered = phaseOrder.filter((phase) => phases.includes(phase));
    ordered.push(...phases.filter((phase) => !ordered.includes(phase)));
    return ordered;
  }, [phases]);
  const [selectedPhase, setSelectedPhase] = useState(visiblePhases[0] ?? "");
  const [selectedDimension, setSelectedDimension] = useState("all");

  const phaseCounts = visiblePhases.map((phase) => ({
    phase,
    count: kpis.filter((kpi) => kpi.phase === phase).length,
  }));

  const dimensions = Array.from(new Set(kpis.map((kpi) => kpi.healthDimension))).sort();
  const dimensionCounts = dimensions.map((dimension) => ({
    name: dimension,
    count: kpis.filter((kpi) => kpi.healthDimension === dimension).length,
    phaseCount: kpis.filter((kpi) => kpi.phase === selectedPhase && kpi.healthDimension === dimension).length,
  }));

  const filteredKpis = kpis.filter(
    (kpi) =>
      kpi.phase === selectedPhase &&
      (selectedDimension === "all" || kpi.healthDimension === selectedDimension),
  );
  const redKpis = filteredKpis.filter((kpi) => kpi.trend[kpi.trend.length - 1].status === "red");

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>Weekly movement</p>
          <h2>KPI health monitor</h2>
        </div>
      </div>

      <div className="phase-tabs config-phase-tabs" role="tablist" aria-label="KPI health phase selector">
        {phaseCounts.map((item) => (
          <button
            aria-selected={selectedPhase === item.phase}
            className={[
              "phase-tab",
              selectedPhase === item.phase ? "phase-tab-active" : "",
              isPhaseOverdue(item.phase, weekStart, phaseConfigs) ? "phase-tab-overdue" : "",
            ].filter(Boolean).join(" ")}
            key={item.phase}
            onClick={() => setSelectedPhase(item.phase)}
            type="button"
          >
            {item.phase}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      <div className="kpi-health-summary">
        <MetricCard label="Filtered KPIs" value={String(filteredKpis.length)} detail={selectedPhase} tone="blue" />
        <MetricCard label="Green latest trend" value={String(filteredKpis.length - redKpis.length)} detail="Latest week status" tone="green" />
        <MetricCard label="Red latest trend" value={String(redKpis.length)} detail="Requires attention" tone={redKpis.length ? "red" : "green"} />
      </div>

      <div className="kpi-config-layout">
        <aside className="dimension-filter-box">
          <button
            className={selectedDimension === "all" ? "dimension-filter-item active" : "dimension-filter-item"}
            onClick={() => setSelectedDimension("all")}
            type="button"
          >
            <span>All dimensions</span>
            <strong>{kpis.filter((kpi) => kpi.phase === selectedPhase).length}</strong>
          </button>
          {dimensionCounts.map((dimension) => (
            <button
              className={selectedDimension === dimension.name ? "dimension-filter-item active" : "dimension-filter-item"}
              key={dimension.name}
              onClick={() => setSelectedDimension(dimension.name)}
              type="button"
            >
              <span>{dimension.name}</span>
              <strong>{dimension.phaseCount}</strong>
              <small>{dimension.count} total</small>
            </button>
          ))}
        </aside>

        <div className="kpi-config-main">
          <div className="kpi-table-wrap">
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
                {filteredKpis.map((kpi) => {
                  const latest = kpi.trend[kpi.trend.length - 1];
                  const actual = actualTrend(kpi.trend);
                  const thresholdTone = latestThresholdTone(latest.value, kpi.threshold, kpi.expectedTrend);
                  const latestTone = thresholdTone ?? latest.status;
                  const monitor = shouldMonitor(kpi);
                  return (
                    <tr key={kpi.code}>
                      <td>
                        <strong>{kpi.metric}</strong>
                        <span>{kpi.category}</span>
                      </td>
                      <td>{directionLabel(kpi.expectedTrend)}</td>
                      <td>
                        <span className={actual === kpi.expectedTrend ? "actual-trend actual-trend-match" : "actual-trend actual-trend-mismatch"}>
                          {directionLabel(actual)}
                        </span>
                      </td>
                      <td>{kpi.threshold ?? "-"}</td>
                      <td>
                        <Sparkline expectedTrend={kpi.expectedTrend} points={kpi.trend} threshold={kpi.threshold} />
                      </td>
                      <td className={thresholdTone ? `latest-value-cell latest-value-cell-${thresholdTone}` : "latest-value-cell"}>
                        <div className="latest-value-wrap">
                          <span className={`status-pill status-pill-${latestTone}`}>{latest.value}</span>
                          <small>Week of {latest.week}</small>
                        </div>
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
    </section>
  );
}
