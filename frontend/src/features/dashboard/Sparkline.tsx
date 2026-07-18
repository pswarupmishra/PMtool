import type { KpiTrendPoint, TrendDirection } from "./dashboardData";

type SparklineProps = {
  points: KpiTrendPoint[];
  expectedTrend: TrendDirection;
  threshold: number | null;
};

function thresholdStatus(value: number, expectedTrend: TrendDirection, threshold: number | null) {
  if (threshold === null) return "none";
  if (expectedTrend === "positive") return value < threshold ? "red" : "green";
  if (expectedTrend === "negative") return value > threshold ? "red" : "green";
  return value === threshold ? "green" : "red";
}

export function Sparkline({ expectedTrend, points, threshold }: SparklineProps) {
  const width = 128;
  const height = 34;
  const padding = 4;
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const latest = points[points.length - 1];

  const coordinates = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : padding + (index * (width - padding * 2)) / (points.length - 1);
    const y = height - padding - ((point.value - min) / range) * (height - padding * 2);
    return { point, x, y };
  });

  const line = coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(" ");

  return (
    <div className="sparkline-wrap" aria-label="Weekly KPI sparkline">
      <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} role="img">
        <polyline className="sparkline-line sparkline-line-neutral" points={line} />
        {coordinates.map((coordinate) => (
          <circle
            className={`sparkline-point sparkline-point-${thresholdStatus(coordinate.point.value, expectedTrend, threshold)}`}
            cx={coordinate.x}
            cy={coordinate.y}
            key={`${coordinate.point.week}-${coordinate.point.value}`}
            r="3"
          >
            <title>{`${coordinate.point.week}: ${coordinate.point.value}${threshold === null ? " (no threshold)" : ` / threshold ${threshold}`}`}</title>
          </circle>
        ))}
      </svg>
      <span>{points[0]?.week} - {latest?.week}</span>
    </div>
  );
}
