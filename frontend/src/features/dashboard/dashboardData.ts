export type TrendDirection = "positive" | "negative" | "equal";
export type TrendStatus = "green" | "red";

export type KpiTrendPoint = {
  week: string;
  value: number;
  status: TrendStatus;
};

export type KpiDefinition = {
  id?: number;
  code: string;
  category: string;
  metric: string;
  formula: string;
  formulaComponents: FormulaComponent[];
  phase: ProjectPhase;
  healthDimension: string;
  expectedTrend: TrendDirection;
  threshold: number | null;
  monitorPeriodWeeks: number | null;
  weight: number;
  trend: KpiTrendPoint[];
};

export type ProjectPhase = string;

export type FormulaComponent = {
  key: string;
  label: string;
  role: "numerator" | "denominator" | "value" | "days";
};

type ApiKpiDefinition = {
  id: number;
  code: string;
  category: string;
  metric: string;
  formula: string;
  formula_components: FormulaComponent[];
  phase: ProjectPhase;
  health_dimension: string;
  expected_trend: TrendDirection;
  threshold?: number | null;
  monitor_period_weeks?: number | null;
  weight: number;
};

function componentKey(label: string) {
  return label
    .toLowerCase()
    .replace("%", "percent")
    .replace("/", " ")
    .replace("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ /g, "_");
}

function componentsForFormula(formula: string): FormulaComponent[] {
  if (formula.includes("/")) {
    const [numerator, denominator] = formula.split("/", 2).map((part) => part.trim());
    return [
      { key: componentKey(numerator), label: numerator, role: "numerator" },
      { key: componentKey(denominator), label: denominator, role: "denominator" },
    ];
  }

  const label = formula.trim();
  return [
    {
      key: componentKey(label),
      label,
      role: label.toLowerCase().includes("day") ? "days" : "value",
    },
  ];
}

export const dashboardProject = {
  name: "JSW MES Rollout",
  sponsor: "Operations Transformation",
  pm: "PM Office",
  location: "VJNR, Monnet",
  projectType: "MES",
  week: "2026-07-13",
};

export const phaseOrder: ProjectPhase[] = [
  "Requirement Analysis",
  "Solution Design",
  "Sprint Development",
  "Testing",
  "Deployment Readiness",
];

const rawKpis: Omit<KpiDefinition, "formulaComponents">[] = [
  {
    code: "requirements_identified_vs_planned",
    category: "Scope",
    metric: "Requirements Identified vs Planned",
    formula: "Actual / Planned",
    phase: "Requirement Analysis",
    healthDimension: "Delivery Predictability",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 72, status: "green" },
      { week: "Jun 29", value: 81, status: "green" },
      { week: "Jul 06", value: 86, status: "green" },
      { week: "Jul 13", value: 91, status: "green" },
    ],
  },
  {
    code: "scope_growth_percent",
    category: "Scope",
    metric: "Scope Growth %",
    formula: "New Requirements / Baseline Requirements",
    phase: "Requirement Analysis",
    healthDimension: "Scope Stability",
    expectedTrend: "negative",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 18, status: "green" },
      { week: "Jun 29", value: 15, status: "green" },
      { week: "Jul 06", value: 17, status: "red" },
      { week: "Jul 13", value: 13, status: "green" },
    ],
  },
  {
    code: "requirement_volatility_percent",
    category: "Scope",
    metric: "Requirement Volatility %",
    formula: "Modified Requirements / Total Requirements",
    phase: "Requirement Analysis",
    healthDimension: "Scope Stability",
    expectedTrend: "negative",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 7,
    trend: [
      { week: "Jun 22", value: 21, status: "green" },
      { week: "Jun 29", value: 18, status: "green" },
      { week: "Jul 06", value: 16, status: "green" },
      { week: "Jul 13", value: 12, status: "green" },
    ],
  },
  {
    code: "business_attendance_percent",
    category: "Stakeholder",
    metric: "Business Attendance %",
    formula: "Actual Attendance / Planned Attendance",
    phase: "Requirement Analysis",
    healthDimension: "User Engagement Index",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 6,
    trend: [
      { week: "Jun 22", value: 78, status: "green" },
      { week: "Jun 29", value: 84, status: "green" },
      { week: "Jul 06", value: 88, status: "green" },
      { week: "Jul 13", value: 91, status: "green" },
    ],
  },
  {
    code: "decision_closure_rate",
    category: "Stakeholder",
    metric: "Decision Closure Rate",
    formula: "Decisions Closed / Decisions Raised",
    phase: "Requirement Analysis",
    healthDimension: "Flow Efficiency",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 6,
    trend: [
      { week: "Jun 22", value: 62, status: "green" },
      { week: "Jun 29", value: 69, status: "green" },
      { week: "Jul 06", value: 74, status: "green" },
      { week: "Jul 13", value: 81, status: "green" },
    ],
  },
  {
    code: "brd_completion_percent",
    category: "Documentation",
    metric: "BRD Completion %",
    formula: "Completed Sections / Planned Sections",
    phase: "Requirement Analysis",
    healthDimension: "Delivery Predictability",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 6,
    trend: [
      { week: "Jun 22", value: 64, status: "green" },
      { week: "Jun 29", value: 73, status: "green" },
      { week: "Jul 06", value: 82, status: "green" },
      { week: "Jul 13", value: 90, status: "green" },
    ],
  },
  {
    code: "master_data_availability_percent",
    category: "Dependencies",
    metric: "Master Data Availability %",
    formula: "Received / Planned",
    phase: "Requirement Analysis",
    healthDimension: "Dependency Fulfillment Index",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 7,
    trend: [
      { week: "Jun 22", value: 55, status: "green" },
      { week: "Jun 29", value: 68, status: "green" },
      { week: "Jul 06", value: 77, status: "green" },
      { week: "Jul 13", value: 84, status: "green" },
    ],
  },
  {
    code: "open_assumptions",
    category: "Design Quality",
    metric: "Open Assumptions",
    formula: "Count",
    phase: "Solution Design",
    healthDimension: "Complexity Variance",
    expectedTrend: "negative",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 4,
    trend: [
      { week: "Jun 22", value: 14, status: "green" },
      { week: "Jun 29", value: 11, status: "green" },
      { week: "Jul 06", value: 9, status: "green" },
      { week: "Jul 13", value: 7, status: "green" },
    ],
  },
  {
    code: "development_completion_percent",
    category: "Development",
    metric: "Development Completion %",
    formula: "Completed Items / Planned Items",
    phase: "Sprint Development",
    healthDimension: "Delivery Predictability",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 42, status: "green" },
      { week: "Jun 29", value: 56, status: "green" },
      { week: "Jul 06", value: 68, status: "green" },
      { week: "Jul 13", value: 76, status: "green" },
    ],
  },
  {
    code: "development_velocity",
    category: "Development",
    metric: "Development Velocity",
    formula: "Delivered Story Points / Planned Story Points",
    phase: "Sprint Development",
    healthDimension: "Delivery Predictability",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 7,
    trend: [
      { week: "Jun 22", value: 71, status: "green" },
      { week: "Jun 29", value: 78, status: "green" },
      { week: "Jul 06", value: 74, status: "red" },
      { week: "Jul 13", value: 82, status: "green" },
    ],
  },
  {
    code: "wip_growth_percent",
    category: "Development",
    metric: "WIP Growth %",
    formula: "Current WIP / Baseline WIP",
    phase: "Sprint Development",
    healthDimension: "Flow Efficiency",
    expectedTrend: "negative",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 5,
    trend: [
      { week: "Jun 22", value: 118, status: "green" },
      { week: "Jun 29", value: 112, status: "green" },
      { week: "Jul 06", value: 116, status: "red" },
      { week: "Jul 13", value: 108, status: "green" },
    ],
  },
  {
    code: "defect_density",
    category: "Testing",
    metric: "Defect Density",
    formula: "Defects / Test Cases",
    phase: "Testing",
    healthDimension: "Quality Index",
    expectedTrend: "negative",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 14, status: "green" },
      { week: "Jun 29", value: 11, status: "green" },
      { week: "Jul 06", value: 9, status: "green" },
      { week: "Jul 13", value: 8, status: "green" },
    ],
  },
  {
    code: "unit_test_success_percent",
    category: "Testing",
    metric: "Unit Test Success %",
    formula: "Passed Tests / Executed Tests",
    phase: "Testing",
    healthDimension: "Quality Index",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 82, status: "green" },
      { week: "Jun 29", value: 86, status: "green" },
      { week: "Jul 06", value: 91, status: "green" },
      { week: "Jul 13", value: 93, status: "green" },
    ],
  },
  {
    code: "uat_participation_percent",
    category: "Testing",
    metric: "UAT Participation %",
    formula: "Actual Participants / Planned Participants",
    phase: "Testing",
    healthDimension: "User Engagement Index",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 6,
    trend: [
      { week: "Jun 22", value: 66, status: "green" },
      { week: "Jun 29", value: 74, status: "green" },
      { week: "Jul 06", value: 72, status: "red" },
      { week: "Jul 13", value: 81, status: "green" },
    ],
  },
  {
    code: "deployment_readiness_percent",
    category: "Deployment",
    metric: "Deployment Readiness %",
    formula: "Ready Items / Required Items",
    phase: "Deployment Readiness",
    healthDimension: "Delivery Predictability",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 35, status: "green" },
      { week: "Jun 29", value: 48, status: "green" },
      { week: "Jul 06", value: 62, status: "green" },
      { week: "Jul 13", value: 70, status: "green" },
    ],
  },
  {
    code: "training_completion_percent",
    category: "Deployment",
    metric: "Training Completion %",
    formula: "Completed Users / Planned Users",
    phase: "Deployment Readiness",
    healthDimension: "User Engagement Index",
    expectedTrend: "positive",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 6,
    trend: [
      { week: "Jun 22", value: 20, status: "green" },
      { week: "Jun 29", value: 38, status: "green" },
      { week: "Jul 06", value: 55, status: "green" },
      { week: "Jul 13", value: 67, status: "green" },
    ],
  },
  {
    code: "critical_high_defects",
    category: "Deployment",
    metric: "Critical/High Defects",
    formula: "Count",
    phase: "Deployment Readiness",
    healthDimension: "Quality Index",
    expectedTrend: "negative",
    threshold: null,
    monitorPeriodWeeks: 3,
    weight: 8,
    trend: [
      { week: "Jun 22", value: 9, status: "green" },
      { week: "Jun 29", value: 7, status: "green" },
      { week: "Jul 06", value: 8, status: "red" },
      { week: "Jul 13", value: 5, status: "green" },
    ],
  },
];

export const kpis: KpiDefinition[] = rawKpis.map((kpi) => ({
  ...kpi,
  formulaComponents: componentsForFormula(kpi.formula),
}));

export function normalizeKpis(apiKpis: ApiKpiDefinition[]): KpiDefinition[] {
  return apiKpis.map((kpi) => ({
    id: kpi.id,
    code: kpi.code,
    category: kpi.category,
    metric: kpi.metric,
    formula: kpi.formula,
    formulaComponents: kpi.formula_components.length
      ? kpi.formula_components
      : componentsForFormula(kpi.formula),
    phase: kpi.phase,
    healthDimension: kpi.health_dimension,
    expectedTrend: kpi.expected_trend,
    threshold: kpi.threshold ?? null,
    monitorPeriodWeeks: kpi.monitor_period_weeks ?? 3,
    weight: kpi.weight,
    trend: buildDefaultTrend(kpi.expected_trend),
  }));
}

function buildDefaultTrend(expectedTrend: TrendDirection): KpiTrendPoint[] {
  const values = expectedTrend === "negative" ? [18, 15, 13, 11] : [62, 70, 78, 84];
  return [
    { week: "Jun 22", value: values[0], status: "green" },
    { week: "Jun 29", value: values[1], status: "green" },
    { week: "Jul 06", value: values[2], status: "green" },
    { week: "Jul 13", value: values[3], status: "green" },
  ];
}

export function getLatestHealthScore(sourceKpis = kpis) {
  const latest = sourceKpis.map((kpi) => ({
    ...kpi,
    latest: kpi.trend[kpi.trend.length - 1],
  }));
  const totalWeight = latest.reduce((sum, kpi) => sum + kpi.weight, 0);
  const greenWeight = latest
    .filter((kpi) => kpi.latest.status === "green")
    .reduce((sum, kpi) => sum + kpi.weight, 0);

  return Math.round((greenWeight / totalWeight) * 100);
}

export function getDimensionScores(sourceKpis = kpis) {
  const grouped = new Map<string, KpiDefinition[]>();

  sourceKpis.forEach((kpi) => {
    grouped.set(kpi.healthDimension, [...(grouped.get(kpi.healthDimension) ?? []), kpi]);
  });

  return Array.from(grouped.entries()).map(([dimension, dimensionKpis]) => {
    const totalWeight = dimensionKpis.reduce((sum, kpi) => sum + kpi.weight, 0);
    const greenWeight = dimensionKpis
      .filter((kpi) => kpi.trend[kpi.trend.length - 1].status === "green")
      .reduce((sum, kpi) => sum + kpi.weight, 0);

    return {
      dimension,
      score: Math.round((greenWeight / totalWeight) * 100),
      redCount: dimensionKpis.filter((kpi) => kpi.trend[kpi.trend.length - 1].status === "red").length,
    };
  });
}
