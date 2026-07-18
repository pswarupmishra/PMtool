type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  tone?: "green" | "blue" | "amber" | "red";
};

export function MetricCard({ label, value, detail, tone = "blue" }: MetricCardProps) {
  return (
    <section className={`metric-card metric-card-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </section>
  );
}
