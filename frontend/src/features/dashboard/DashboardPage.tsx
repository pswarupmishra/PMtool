import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BarChart3, Gauge, GitBranch, Link, ShieldCheck, Sparkles, Users } from "lucide-react";

import jswSteelLogo from "../../assets/jsw-steel-logo.png";
import { AppShell } from "../../components/layout/AppShell";
import type { DashboardView } from "../../components/layout/AppShell";
import { apiGet } from "../../lib/api/client";
import { ConfigurationPage } from "./ConfigurationPage";
import { DocumentationPage } from "./DocumentationPage";
import { HeatmapPage } from "./HeatmapPage";
import { KpiHealthPage } from "./KpiHealthPage";
import { ProgressMonitorPage } from "./ProgressMonitorPage";
import {
  kpis,
  normalizeKpis,
  type KpiTrendPoint,
  type KpiDefinition,
  type TrendDirection,
} from "./dashboardData";
import { WeeklyInputPanel } from "./WeeklyInputPanel";

type ProjectConfig = {
  id: number;
  name: string;
};

type ProjectPhaseConfig = {
  id: number;
  name: string;
  end_date: string | null;
};

type HeatmapKpi = {
  code: string;
  category: string;
  metric: string;
  expected_trend: TrendDirection;
  monitor_period_weeks: number | null;
  threshold: number | null;
  trend_values: Array<{
    week_start: string;
    value: number;
    display_value: number;
    status: "green" | "red" | "grey";
    applicability_status: "applicable" | "not_relevant";
    applicability_reason: string | null;
  }>;
};

type HeatmapCell = {
  phase: string;
  health_dimension: string;
  kpis: HeatmapKpi[];
};

type HeatmapResponse = {
  week_start: string | null;
  cells: HeatmapCell[];
};

const loginHealthIndexes = [
  { label: "User Engagement Index", Icon: Users },
  { label: "Dependency Fulfillment Index", Icon: Link },
  { label: "Delivery Predictability", Icon: BarChart3 },
  { label: "Scope Stability", Icon: ShieldCheck },
  { label: "Complexity Variance", Icon: GitBranch },
  { label: "Quality Index", Icon: Sparkles },
  { label: "Flow Efficiency", Icon: Gauge },
];

function formatWeek(weekStart: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(`${weekStart}T00:00:00`));
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function normalizeHealthKpis(data: HeatmapResponse): KpiDefinition[] {
  return data.cells.flatMap((cell) =>
    cell.kpis.map((kpi) => ({
      code: kpi.code,
      category: kpi.category,
      metric: kpi.metric,
      formula: "",
      formulaComponents: [],
      phase: cell.phase,
      healthDimension: cell.health_dimension,
      expectedTrend: kpi.expected_trend,
      threshold: kpi.threshold,
      monitorPeriodWeeks: kpi.monitor_period_weeks ?? 3,
      weight: 1,
      trend: kpi.trend_values.map<KpiTrendPoint>((point) => ({
        week: formatWeek(point.week_start),
        value: point.display_value,
        rawValue: point.value,
        status: point.status,
        applicabilityStatus: point.applicability_status,
        applicabilityReason: point.applicability_reason,
      })),
    })),
  );
}

export function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState("PMO");
  const [loginPassword, setLoginPassword] = useState("test123");
  const [loginError, setLoginError] = useState("");
  const [loggedInAt, setLoggedInAt] = useState<number | null>(null);
  const [loggedInSeconds, setLoggedInSeconds] = useState(0);
  const [activeView, setActiveView] = useState<DashboardView>("heatmap");
  const [visibleKpis, setVisibleKpis] = useState<KpiDefinition[]>(kpis);
  const [healthKpis, setHealthKpis] = useState<KpiDefinition[]>(kpis);
  const [projectPhases, setProjectPhases] = useState<ProjectPhaseConfig[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<"loading" | "api" | "fallback">("loading");
  const [weekStart, setWeekStart] = useState("2026-07-20");

  const refreshKpis = useCallback(() => {
    apiGet<Parameters<typeof normalizeKpis>[0]>("/api/v1/kpis/?active_only=true")
      .then((apiKpis) => {
        setVisibleKpis(normalizeKpis(apiKpis));
        setCatalogStatus("api");
      })
      .catch(() => {
        setVisibleKpis(kpis);
        setCatalogStatus("fallback");
      });
  }, []);

  const refreshHealthKpis = useCallback(() => {
    apiGet<HeatmapResponse>("/api/v1/dashboard/projects/1/heatmap")
      .then((data) => {
        const nextKpis = normalizeHealthKpis(data);
        setHealthKpis(nextKpis.length ? nextKpis : visibleKpis);
        if (data.week_start) {
          setWeekStart(data.week_start);
        }
      })
      .catch(() => setHealthKpis(visibleKpis));
  }, [visibleKpis]);

  const refreshProjectPhases = useCallback(() => {
    apiGet<ProjectConfig[]>("/api/v1/projects/")
      .then((projects) => {
        const project = projects[0];
        if (!project) {
          setProjectPhases([]);
          return;
        }
        apiGet<ProjectPhaseConfig[]>(`/api/v1/project-phases/?project_id=${project.id}&active_only=true`)
          .then(setProjectPhases)
          .catch(() => setProjectPhases([]));
      })
      .catch(() => setProjectPhases([]));
  }, []);

  useEffect(() => {
    refreshKpis();
    refreshProjectPhases();
  }, [refreshKpis, refreshProjectPhases]);

  useEffect(() => {
    if (activeView === "weekly-input" || activeView === "kpi-health") {
      refreshKpis();
    }
  }, [activeView, refreshKpis]);

  useEffect(() => {
    if (activeView === "kpi-health") {
      refreshHealthKpis();
    }
  }, [activeView, refreshHealthKpis]);

  useEffect(() => {
    if (activeView === "kpi-health" || activeView === "progress-monitor" || activeView === "configuration") {
      refreshProjectPhases();
    }
  }, [activeView, refreshProjectPhases]);

  useEffect(() => {
    if (!isAuthenticated || loggedInAt === null) return undefined;
    const updateDuration = () => setLoggedInSeconds(Math.floor((Date.now() - loggedInAt) / 1000));
    updateDuration();
    const timer = window.setInterval(updateDuration, 1000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, loggedInAt]);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loginUsername === "PMO" && loginPassword === "test123") {
      setLoginError("");
      setIsAuthenticated(true);
      setLoggedInAt(Date.now());
      setLoggedInSeconds(0);
      setActiveView("heatmap");
      return;
    }
    setLoginError("Invalid username or password");
  }

  function handleLogout() {
    setIsAuthenticated(false);
    setLoggedInAt(null);
    setLoggedInSeconds(0);
    setLoginError("");
    setLoginUsername("PMO");
    setLoginPassword("test123");
    setActiveView("heatmap");
  }

  if (!isAuthenticated) {
    return (
      <main className="login-page">
        <div className="login-content">
          <form className="login-panel" onSubmit={handleLogin}>
            <img alt="JSW Steel" src={jswSteelLogo} />
            <div className="login-heading">
              <span>Project Management Dashboard</span>
              <h1>Project Control dashboard</h1>
            </div>
            <label>
              Username
              <input
                autoComplete="username"
                onChange={(event) => setLoginUsername(event.target.value)}
                value={loginUsername}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                onChange={(event) => setLoginPassword(event.target.value)}
                type="password"
                value={loginPassword}
              />
            </label>
            {loginError ? <p className="login-error">{loginError}</p> : null}
            <button type="submit">Login</button>
          </form>
          <section className="login-health-index" aria-label="Health indexes tracked">
            <div className="login-health-heading">
              <span>Health indexes tracked</span>
              <strong>Project performance signals</strong>
            </div>
            <div className="login-health-grid">
              {loginHealthIndexes.map(({ Icon, label }) => (
                <div className="login-health-item" key={label}>
                  <Icon size={22} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <AppShell
      activeView={activeView}
      loggedInDuration={formatDuration(loggedInSeconds)}
      onLogout={handleLogout}
      onViewChange={setActiveView}
    >
      {activeView === "weekly-input" ? (
        <WeeklyInputPanel
          catalogStatus={catalogStatus}
          kpis={visibleKpis}
          onWeekStartChange={setWeekStart}
          weekStart={weekStart}
        />
      ) : null}

      {activeView === "progress-monitor" ? <ProgressMonitorPage weekStart={weekStart} /> : null}

      {activeView === "kpi-health" ? (
        <KpiHealthPage kpis={healthKpis} phaseConfigs={projectPhases} weekStart={weekStart} />
      ) : null}

      {activeView === "heatmap" ? <HeatmapPage /> : null}

      {activeView === "documents" ? <DocumentationPage /> : null}

      {activeView === "configuration" ? <ConfigurationPage onKpisChanged={refreshKpis} /> : null}
    </AppShell>
  );
}
