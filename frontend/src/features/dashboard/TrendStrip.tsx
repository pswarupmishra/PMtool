import type { KpiTrendPoint } from "./dashboardData";

type TrendStripProps = {
  points: KpiTrendPoint[];
};

export function TrendStrip({ points }: TrendStripProps) {
  return (
    <div className="trend-strip" aria-label="Weekly KPI trend">
      {points.map((point) => (
        <span
          className={`trend-dot trend-dot-${point.status}`}
          key={`${point.week}-${point.value}`}
          title={`${point.week}: ${point.value}`}
        />
      ))}
    </div>
  );
}
